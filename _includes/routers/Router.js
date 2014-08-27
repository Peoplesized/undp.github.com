routers.Global = Backbone.Router.extend({
    routes: {
        '': 'redirect',
        'filter/*path': 'redirect', // filters --> "/donor-countries-MULTI_AGY/operating_unit-BRA";
        ':fiscalyear': 'fiscalyear', // fiscalyear --> "2014"
        ':fiscalyear/filter/*path': 'fiscalyear', // fiscalyear, filters
        'project/:id': 'project', //id --> "00064848"
        'project/:id/output-:output': 'project', //id-->"00064848", output ? //TODO this is a variation of the project page, what's different?
        'widget/*options': 'widgetRedirect', //options --> see Widget.js
        ':fiscalyear/widget/*options': 'widget',
        'about/*subnav': 'about', // subnav --> {{post.tag}}
        'top-donors/*category': 'topDonors' //cat --> "regular"
    },
    processedFacets: false,
    exsitingYear: false,
    redirect: function() {
        this.navigate(CURRENT_YR, {trigger: true});
    },

    widgetRedirect: function(path) {
        this.navigate(CURRENT_YR + '/widget/' + path, {trigger: true});
    },

    fiscalyear: function (year, path, embed) {

        var that = this;

        if (!this.existingYear) {this.existingYear = year}

        if (year.indexOf(FISCALYEARS)){

            this.projects = new Projects();
            this.projects.url = 'api/project_summary_' + year + '.json';

            // can we use listenTo instead?
            this.projects.fetch({
                success:function(){
                    that.browser(year, path, embed);
                }
            });
        } else {
            that.project(year, false,false); // in this case year is the project id
        }
    },
    browser: function (year, path, embed) {
        // views.App (including views.YearNav)
        // views.Map
        // views.Facets (including views.Filters)
        // views.Widget
        // views.Projects (TODO not working)
        // views.Donor (donorViz)
        // views.Breadcrumbs
        // views.Description

        var that = this;
        var unit = false, // this should be reused throughout the site
            donorCountry = false;

        // Parse hash
        // hash comes in forms as 'operating_unit-ARG/donor-12300'
        var hashParts = (path) ? path.split('/') : []; // --> ['operating_unit-ARG','donor-12300']

        this.processedFacets = _(hashParts).map(function(part){

            var selectedFacets = part.split('-');  // --> ['operating_unit','ARG']

            if (selectedFacets[0] === 'operating_unit'){
                unit = selectedFacets[1];
            } else if (selectedFacets[0] === 'donor_countries'){
                donor = selectedFacets[1]
            }
            return {
                collection: selectedFacets[0],
                id: selectedFacets[1]
            };
        });

        // initiate App view
        // which contains the filter-items div
        // used in Facets()


        if (!embed) {
            // Load in the top donors info and feedbackform dets.
            window.setTimeout(function() { $('html, body').scrollTop(0); }, 0);
            // Load the main app view
            that.app = that.app || new views.App({
                el: '#browser',
                year: year
            });
        } else {
            that.app = that.app || new views.App({
                el: '#embed',
                year: year,
                embed: embed
            });
        }

        // mainInterface: facets, filters, map and widget
        var mainInterface = function(){
            new views.Facets();

            // Create summary map view
            if (!embed){
                that.projects.map = new views.Map({
                    el: '#homemap',
                    collection: that.projects
                });
                that.projects.widget = new views.Widget({
                    context: 'projects'
                });
            } else {
                that.projects.map = new views.Map({
                    el: '#homemap',
                    collection: that.projects,
                    embed: embed
                });
            }

        };

        if (that.fiscalYear != year){
            // if (that.fiscalYear && that.fiscalYear != year){that.projects.map.map.remove();}
            that.fiscalYear = year;

            that.projects = new Projects(that.allProjects.filter(customFilter));
            that.projects.view = new views.Projects({ collection: that.projects });

            // TODO what is this?
            that.projects.cb = _(mainInterface).bind(that);
            that.projects.watch();

            that.app.updateYear(year);
        } else {
            // if projects are already present
            // that.projects.cb = updateDescription;
            that.projects.reset(that.allProjects.filter(customFilter));
        }


        // Check for funding countries to show donor visualization
        if (donor){
            that.donor = new views.Donors ();
            $('#donor-view').show();
        } else {
            that.donor = false;
            $('#donor-view').hide();
        }

        // Save default description
        that.defaultDescription = that.defaultDescription || $('#description p.intro').html();

        // Show proper HDI data
        if (unit && ((HDI[unit]) ? HDI[unit].hdi != '' : HDI[unit])) {
            that.hdi = new views.HDI({
                unit: unit
            });
            if ($('.map-btn[data-value="hdi"]').hasClass('active')) {
                $('#chart-hdi').addClass('active');
            }
        } else {
            that.hdi = false;
            $('#chart-hdi').removeClass('active');
            $('ul.layers li.no-hover.hdi a').css('cursor','default');
            $('ul.layers li.hdi .graph').removeClass('active');
            if (unit) {
                $('#hdi').html('no data');
                $('.map-btn[data-value="hdi"] .total-caption').html('HDI');
            } else {
                $('#hdi').html(_.last(HDI['A-000'].hdi)[1]);
                $('.map-btn[data-value="hdi"] .total-caption').html('HDI Global');
            }
        }

        new views.Breadcrumbs();
        new views.Description();
    },

    project: function (id, output, embed) {
        var that = this;

        if (!embed) {
            // Load in feedbackform deats
            that.feedback();

            var nav = new views.Nav({add:'project'});

            window.setTimeout(function() { $('html, body').scrollTop(0); }, 0);

            that.project.widget = new views.Widget({
                context: 'project'
            });
        }

        // Set up this route

        that.project.model = new Project({
            id: id
        });
        // loading the specific project
        that.project.model.fetch({
            success: function (data) {
                if (that.project.view) that.project.view.undelegateEvents();
                that.project.view = new views.ProjectProfile({
                    el: (embed) ? '#embed' : '#profile',
                    model: that.project.model,
                    embed: embed || false,
                    gotoOutput: (output) ? output : false
                });

            }
        });
    },

    widget: function (year, path) {
        var that = this,
            parts = path.split('?'),
            options = parts[1],
            pathTemp = parts[0]; // something widget related, temporarily renamed to differentiate from the path passed from url

        pathTemp = (pathTemp) ? pathTemp.split('/') : [];
        options = (options) ? options.split('&') : [];

        if (pathTemp[0] === 'project') {
            loadjsFile('api/project_summary_' + year + '.js', year, function() {
                that.project(parts[0].split('/')[1], false, options);
            });
        } else {
            var path = parts[0];
            if (path === '') path = undefined;
            that.fiscalyear(year, path, options);
        }
    },
    about: function (subnav) {
        window.setTimeout(function () {
            $('html, body').scrollTop(0);
        }, 0);

        var nav = new views.Nav({add:'about',subnav:subnav});
        var breadcrumbs = new views.Breadcrumbs({add:'about',subnav:subnav})
    },
    topDonors: function (category) {
        var that = this;

        // Add nav
        var nav = new views.Nav({add:'topDonors'});
        var breadcrumbs = new views.Breadcrumbs({add:'topDonors'});

        if (!that.donorsGross) {
            that.donorsGross = new TopDonors({type: category});
            that.donorsGross.url = 'api/top-donor-gross-index.json';

            that.donorsLocal = new TopDonors({type: 'amount'});
            that.donorsLocal.url = 'api/top-donor-local-index.json';

            that.donorsGross.fetch({
                success: function () {
                    that.topDonorsGross = new views.TopDonors({
                        el: '.donor-gross-table',
                        collection: that.donorsGross
                    });
                }
            });
            this.donorsLocal.fetch({
                success: function () {
                    that.topDonorsLocal = new views.TopDonors({
                        el: '.donor-local-table',
                        collection: that.donorsLocal
                    });
                }
            });

            window.setTimeout(function () {
                $('html, body').scrollTop(0);
            }, 0);

        } else {
            that.topDonorsGross.update(category);
        }
    },

    feedback: function () {

        // Handle feedback form submission
        $('#feedback-form').submit(function (e) {
            // Require 'Feedback' field to have content
            if ($('#entry_2').val() === '') {
                alert('Please fill in the required fields before submitting.');
                return false;
            }

            // Set URL for feedback form
            $('#entry_3').val(window.location);

            var button = $('input[type=submit]', this),
                data = $(this).serialize(),
                form = this;

            $.ajax({
                type: 'POST',
                url: 'https://docs.google.com/spreadsheet/formResponse?formkey=dFRTYXNUMWIzbXRhVF94YW9rVmlZNVE6MQ&amp;ifq',
                data: data,
                complete: function () {
                    $('#feedback').modal('hide');
                    $('input[type=text], textarea', form).val('');
                }
            });
            return false;
        });
    }

});

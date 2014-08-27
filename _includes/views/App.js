views.App = Backbone.View.extend({
    events: {
        'click a.filter': 'setFilter',
        'keyup #filters-search': 'searchFilter',
        'click #filters .label': 'toggleFilter',
        'click #filters .reset': 'clearFilter',
        'click .map-btn': 'mapLayerswitch',
        'submit .form-search': 'submitForm',
        'click .widget-config': 'requestIframe',
        'click #year .filter-items a': 'yearChange',
        'click .map-filter':'mapFilter',
        'click .view-switch a': 'activeMap',
        'click a#layers-back': 'layersBack'
    },
    
    initialize: function(options) {
        // Toggle country selector
        $(window).on('click', '#country-selector', _(this.showCountries).bind(this));
        $(window).on('click', '#country-list .close', _(this.hideCountries).bind(this));

        this.render();
    },

    render: function() {
        if (this.options.embed) {
            this.$el.empty().append(templates.embedProjects());
            this.$el.find('.option').hide();
            _(this.options.embed).each(function (o) {
                $('[data-option="' + o + '"]').show();
            });
        } else {
            this.$el.empty().append(templates.app({
                base: BASE_URL,
                year: this.options.year
            }));
        }


        // display map Filter

        $('.map-filter').removeClass('active') // reset the subfilter look
        $('#map-filters').find('#loc-all').addClass('active');

        // if(unit){
            $('#map-filters').removeClass('disabled');//shows type sub-filter
            $('.map-btn').removeClass('active');
            $('ul.layers li').addClass('no-hover');
            $('ul.layers li.hdi .graph').addClass('active');
        // } else {
        //     $('#map-filters').addClass('disabled'); //hides type sub-filter
        //     $('ul.layers li').removeClass('no-hover');
        //     $('ul.layers li.hdi .graph').removeClass('active');
        // }

        // adding years in render since the year div is part of app template
        this.years = new views.YearNav();

        // highlight projects
        $('#mainnav li').first().addClass('active');

        // about nav
        $('#mainnav a.parent-link').click(function(e) {
            e.preventDefault();
            var $target = $(e.target);

            if ($target.parent().hasClass('parent-active')) {
                $target.parent().removeClass('parent-active');
            } else {
                $target.parent().addClass('parent-active');
            }
        });

        this.selectYear(this.options.year);

        return this;
    },

    selectYear: function(year) {
        var yearId = 'year-' + this.options.year;
        // set selected year as filtered
        $('#year .filter-items').find('a#'+yearId).removeClass('inactive').addClass('active');

        // set year as filtered
        $('#year').addClass('filtered');
        $('#year li a').addClass('inactive');
    },
    setFilter: function(e) {
        var $target = $(e.target),
            path = '',
            parts = ($target.attr('id')) ? $target.attr('id').split('-') : '',
            filters = [{
                collection: parts[0],
                id: parts[1]
            }],
            year = global.fiscalYear;
            shift = false;

        if (parts[0] != 'year'){ // treat year differently, see yearChange

            this.clearFilter(e);

            _(global.processedFacets).each(function(filter) {
                if (_.isEqual(filter, filters[0])) {
                    shift = true;
                } else if (filter.collection !== filters[0].collection) {
                    filters.push(filter);
                }
            });

            if (shift) filters.shift();

            filters = _(filters).chain()
                .compact()
                .map(function(filter) {
                    return filter.collection + '-' + filter.id;
                })
                .value().join('/');

            path = (filters.length) ? year + '/filter/' + filters : year;

            e.preventDefault();

            // $('#all-projects').attr('href', '#' + path);
            global.navigate(path, { trigger: true });
        }
    },

    searchFilter: function(e) {
        var $target = $(e.target),
                val = $target.val().toLowerCase();

        $target.parent().find('.reset').toggleClass('hidden', (val === ''));

        _(this.views).each(function(view) {
            view.collection.each(function(model) {
                var name = model.get('name').toLowerCase();

                if (val === '' || name.indexOf(val) >= 0) {
                    model.set('visible', true);
                } else {
                    model.set('visible', false);
                }
            });

            view.render(true);
        });

        // Open all filter facets on search
        if (val === '') {
            $('.topics').toggleClass('active', false);
        } else {
            $('.topics').toggleClass('active', true);
        }
    },

    clearFilter: function(e) {
        e.preventDefault();
        $(e.target).parent().find('input').val('');
        this.searchFilter(e);
        return false;
    },

    toggleFilter: function (e) {

        var $target = $(e.target),
            cat = $target.attr('data-category'),
            $parent = $('#' + cat);
            e.preventDefault();
            // Bail on the this function if the user has selected
            // a label that has an active filtered selection.
            if ($parent.hasClass('filtered')) return false;

            if ($parent.hasClass('active')) {
                $parent.toggleClass('active', false);
                if (this.views[cat]) {
                    this.views[cat].active = false;
                }
            } else {
                $('.topics').each(function () {
                    // Loop through all the filtered menus
                    // to close active menus providing they don't
                    // have an active filtered selection.
                    if (!$(this).hasClass('filtered') && !$(this).is('#year')) {
                        $(this).toggleClass('active', false);
                    }
                });
                $parent.toggleClass('active', true);
                if (this.views[cat]) {
                    this.views[cat].active = true;
                }
            }
            return false;
    },

    mapLayerswitch: function(e) {
        e.preventDefault();
        $('#chart-hdi').removeClass('active');
        var $target = $(e.currentTarget);
        $('.map-btn').removeClass('active');

        this.layer = $target.attr('data-value') || 'budget';

        // When on operating unit, turn on/off the HDI graph
        if ($('ul.layers li').hasClass('no-hover')){
            if ($target.attr('data-value') === 'hdi' && global.hdi) {
                if ($('li.hdi').hasClass('active')) {
                    $('li.hdi').removeClass('active')
                    $($target).removeClass('active');
                    $('#chart-hdi').removeClass('active');
                } else {
                    $('#chart-hdi').addClass('active');
                    $($target).addClass('active');
                    $('li.hdi').addClass('active');
                }
            } 
        } else {
            $target.addClass('active');
        }

        global.projects.mapView.buildLayer(this.layer); // see Map.js
        return false;
    },

    submitForm: function(e) {
        return false;
    },

    showCountries: function(e) {
        e.preventDefault();
        $('#country-list').css('display', 'block');
    },

    hideCountries: function(e) {
        e.preventDefault();
        $('#country-list').css('display', 'none');
    },

    yearChange: function(e) {
        e.preventDefault();
        var $target = $(e.target),
            selectedYear = $target.attr('id').split('-')[1]; // number of the year

        $target.toggleClass('active');

        if($target.hasClass('active')){
            $('#year').toggleClass('filtered',true);
            $('#year').toggleClass('active',false);
            $('#year .filter-items a').addClass('inactive');
            $target.removeClass('inactive').addClass('active');
        } else {
            $('#year').toggleClass('filtered',false);
            $('#year').toggleClass('active',true);
            $('#year .filter-items a').removeClass('inactive');
        }
        if (selectedYear != global.fiscalYear) {
            var filters = _(global.processedFacets).chain()
                .compact()
                .map(function(filter) {
                    return filter.collection + '-' + filter.id;
                })
                .value().join('/');

            var path = (filters.length) ? selectedYear + '/filter/' + filters : selectedYear;
            
            app.navigate(path, { trigger: true });
        }
    },

    updateYear: function(year) {
        $('#total-budget').next('span').html(year + ' Budget');
        $('#total-expenditure').next('span').html(year + ' Expense');
    },

    mapFilter: function(e){
        e.preventDefault();
        $target = e.target;
        
        var subFilter = $target.id.split('-')[1];

        $('.map-filter').removeClass('active');
        $('#'+$target.id).addClass('active');

        var currentCenter = global.projects.mapView.map.getCenter(),
            currentZoom = global.projects.mapView.map.getZoom();

        global.projects.mapView.buildLayer(this.layer,subFilter,currentCenter,currentZoom); // see Map.js
    },

    activeMap: function(e) {
        e.preventDefault();
        $('.view-switch a').removeClass('active');
        $(e.target).addClass('active');
        $('#mainnav li').first().addClass('re-active');
        setTimeout(function(){global.projects.mapView.map.invalidateSize({pan:true});}, 200);
    },

    layersBack: function(e) {
        e.preventDefault();
        $('a#layers-back').toggleClass('active');
        $('ul.layers').toggleClass('active');
    },

    requestIframe: function() {
        var el = $('#widget'),
            embedPath,
            widgetOpts = ['title', 'map', 'projects'];

        $('.widget-options a',el).removeClass('active');

        _(widgetOpts).each(function(widgetTitle){
            widgetEl =widgetTitle + '-opt';
            $("." + widgetEl).find('a').addClass('active');
        })

        if (location.hash.split('/').length === 1) {
            embedPath = location.hash + '/widget/';
        } else {
            embedPath = location.hash.replace('filter', 'widget')
        }

        var defaultIframe = '<iframe src="'+ BASE_URL + 'embed.html' + embedPath + '?' +
                        widgetOpts.join('&') + '" width="100%" height="100%" frameborder="0"> </iframe>';

        $('.widget-preview', el).html(defaultIframe);
        $('.widget-code', el)
            .val(defaultIframe.replace('src="{{site.baseurl}}/','src="' + BASE_URL))
            .select();
    }
});

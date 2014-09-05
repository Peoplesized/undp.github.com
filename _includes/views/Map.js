views.Map = Backbone.View.extend({
    el: '#homemap',
    initialize: function() {
        this.nations = new Nationals();
        this.nations.fetch();
        if (this.options.render) this.render();
    },
    render: function() {
        var view = this,
            wheelZoom = true,
            category;

        // detect filters
        view.regionFilter =_(global.processedFacets).findWhere({facet:"region"});
        view.opUnitFilter =_(global.processedFacets).findWhere({facet:"operating_unit"});

        // remove 'operating unit has no geo' paragraph
        view.$el.find('.inner-grey').remove();

        // category enables circle map to be switched between five (budget,expend, projects, budget sources. hdi) tabs
        if (!view.options.embed) {
            category = $('.map-btn.active').attr('data-value') || 'budget';
            // when no operating unit is selected, reset to the global map
            if (category === 'budget' && _.isUndefined(view.opUnitFilter)){
                $('.map-btn.budget').addClass('active')
            };
        } else {
            // if it's embed mode, set the circles to the budget layer, disable zoom wheel
            category = 'budget';
            wheelZoom = false;
        };
        
        view.map = L.mapbox.map(this.el,MAPID,{
            center: [20,20],
            zoom: 2,
            minZoom: 2,
            maxZoom: 10,
            scrollWheelZoom: wheelZoom
        });

        // create circle or cluster based on the operating unit filter
        if (_.isObject(view.opUnitFilter)){
            view.markers = new L.MarkerClusterGroup({
                showCoverageOnHover:false,
                maxClusterRadius:30
            });

            // in embed if selected from a circle view (where widget-world has a link), keep the widget-nav
            if ($('#widget-world').attr('href')) {
                $('.widget-nav').show()
            } else {
                $('.widget-nav').hide()
            }
        } else {
            view.markers = new L.LayerGroup();
        };

        //for IE 8 and above add country outline
        if (!IE || IE_VERSION > 8){
            view.outline = new L.GeoJSON()
        }

        view.buildLayer(category);
    },
    buildLayer: function(layer,mapFilter,mapCenter,mapZoom){
        var view = this;
        view.map.removeLayer(view.markers); //remove the marker featureGroup from view.map
        view.markers.clearLayers(); // inside of marker group, clear the layers from the previous build
        
        if(_.isObject(view.opUnitFilter)){

            var parent = _(view.nations.models).findWhere({id:view.opUnitFilter.id}),
                iso = parseInt(parent.get('iso_num'));

            var subs = new Subnationals();
            subs.fetch({
                url: 'api/units/' + view.opUnitFilter.id + '.json',
                success:function(){
                // the projects in subs need to be matched to the unit models
                // matching subs.models and unit.models on id and set the visible ones
                    _(view.collection.models).each(function(model){
                        if (subs.get(model.id) != undefined){
                            subs.get(model.id).set({visible:true})
                        }
                    })
                    filteredSubs = subs.filtered(); //filtered() is a method in the collection
                    view.renderClusters(mapFilter,filteredSubs);
                }
            });

            // find the iso number from the national models
            if (_.isNaN(iso) && parent.get('id') != 'none'){
                view.$el.prepend('<div class="inner-grey">'+
                                 '<p>The selected operating unit and its project(s) do not have geographic information.</p>'+
                                 '</div>');
            } else {
                if (!IE || IE_VERSION > 8) {
                    view.addCountryOutline(parent,iso);
                } else {
                    view.map.setView([parent.lat,parent.lon],4);
                }
            }
        } else {
            view.renderCircles(layer,view.nations);
            if(_.isObject(view.regionFilter)){
                regionCenter = util.regionCenter(view.regionFilter.id);
                view.map.setView(regionCenter.coord,regionCenter.zoom,{reset:true});
            }
        }

    },
    goToLink:function(path){
        global.navigate(path, { trigger: true });
        $('#browser .summary').removeClass('off');
    },
    circleHighlight: function(e,options){
        if (!options){options = {}}
        $target = e.target;
        $target.setStyle({
            color: options.color || '#fff',
            weight: options.weight || 1,
            opacity: options.opacity || 1,
            fillColor: options.fillColor || '#0055aa',
            fillOpacity: options.fillOpacity || 0.6
        })
    },
    //
    //TODO move the popups to a template
    //
    circlePopup: function(cat,feature) {
        var description = '<div class="popup">' +
                            '<div class="title">' +
                                '<b>' + feature.properties.title + '</b>' + 
                            '</div>' +
                            '<table class="pop"><tr><td>Projects</td><td>' + feature.properties.count + '</td></tr>' +
                                '<tr><td>Budget</td><td>' +  accounting.formatMoney(feature.properties.budget) + '</td></tr>' + 
                                '<tr><td>Expense</td><td>' + accounting.formatMoney(feature.properties.expenditure) + '</td></tr>' + 
                                '<tr><td>HDI</td><td>' + feature.properties.hdi + '</td></tr>' + 
                            '</table>' + 
                         '</div>';
        return description;
    },
    // CLUSTER
    clusterPopup: function(feature, g) {
        var project = feature.properties.project,
            output = feature.properties.output_id,
            title = feature.properties.title,
            focus_clean = (feature.properties.focus_descr).replace(/\s+/g, '-').toLowerCase().split('-')[0],
            focus_area = (feature.properties.focus_descr).toTitleCase(),
            type = g.type[feature.properties.type],
            // scope = (g.scope[feature.properties.scope]) ? g.scope[feature.properties.scope].split(':')[0] : 'unknown',
            precision = g.precision[feature.properties.precision];
        if (focus_clean){
            var description = '<div class="popup top"><div><b>' + title + '</b></div>'
                + '<div><table class="pop"><tr><td>Project</td><td>' + project + '</td></tr><tr><td>Output</td><td>' + output + '</td></tr></table></div>'
                + '<div class="focus"><span class="'+focus_clean+'"></span><p class="space">' + focus_area + '<p></div></div>'
                + '<div class="popup bottom"><div><b>Location type: </b>' + type + '</div>'
                + '<div><b>Precision: </b>' + precision + '</div></div>';
        } else {
            var description = '<div class="popup top"><div><b>' + title + '</b></div>'
                + '<div><table class="pop"><tr><td>Project</td><td>' + project + '</td></tr><tr><td>Output</td><td>' + output + '</td></tr></table></div></div>'
                + '<div class="popup bottom"><div><b>Location type: </b>' + type + '</div>'
                + '<div><b>Precision: </b>' + precision + '</div></div>';
        }
        return description;
    },
    outlineStyle: {
        "color":"#b5b5b5",
        "weight":0,
        clickable: false
    },
    addCountryOutline: function(parent, iso) {
        var view = this;
        view.outline.clearLayers();

        queue()
            .defer(util.request,'api/world.json')
            .defer(util.request,'api/india_admin0.json')
            .await(outline);

        function outline(error,world,india){
            var topoFeatures = topojson.feature(world, world.objects.countries).features,
                selectedFeature = _(topoFeatures).findWhere({id:iso}),
                coords = selectedFeature.geometry.coordinates;

            // get outline
            if (parent.get('id') === 'IND') {
                var indiaFeatures = topojson.feature(india, india.objects.india_admin0).features;
                _(indiaFeatures).each(function(f){
                    view.outline.addData(f)
                      .setStyle(view.outlineStyle);
                })
            } else {
                view.outline.addData(selectedFeature)
                  .setStyle(view.outlineStyle);
            }

            // zoom into the specific country
            if (IE_VERSION != 10) { //IE10 does not handle any map zoom/pan
                if (parent.get('id') === 'RUS') {
                    view.map.setView([parent.lat,parent.lon],2);
                } else {
                    view.map.fitBounds(util.ctyBounds(coords));
                }
            }

            view.outline.addTo(view.map);
        }
    },
    renderClusters: function(mapFilter,collection){
        var view = this;
        var filteredMarkers = [],
            projectWithNoGeo = 0;
            hasGeo = false;

        _(collection.models).each(function(model){
            if (model.geojson){
                hasGeo = true;
                filteredMarkers.push(model.geojson);
                filteredMarkers = _(filteredMarkers).flatten(false);
            } else {
                projectWithNoGeo += 1;
            }
        })

        // TODO description should be in template
        // should be in the description template
        var verbDo = (projectWithNoGeo === 1) ? "does" : "do";
        var verbHave = (projectWithNoGeo === 1) ? "has" : "have";

        // append sub-national location paragraph
        if (projectWithNoGeo != 0 && !hasGeo){
            $('#map-filters').addClass('disabled'); // no sub filter on page
            $('#geography').html("None of these projects have geographic information.");
        } else if (projectWithNoGeo != 0 && hasGeo){
            var projectWithNoGeoParagraph =  projectWithNoGeo
                + " of them " + verbDo + " not " + verbHave + " geographic information; the remaining "
                + (filteredSubs.length - projectWithNoGeo)
                + " have "
                + filteredMarkers.length
                + " subnational locations in total."
            $('#geography').html(projectWithNoGeoParagraph);
        };

        // create clustered markers

        queue()
            .defer(util.request,'api/subnational-locs-index.json')
            .defer(util.request,'api/focus-area-index.json')
            .await(colorize);

        function colorize(error,subLocIndex,focusIndex){
            _(filteredMarkers).each(function(feature){
                _(focusIndex).each(function(f){
                    if (f.id == feature.properties.focus_area){
                       return feature.properties['marker-color'] = f.color;
                    };
                });
            })
            // Set popups and color changes on hover
            function onEachFeature(feature, layer) {
                var oldOptions = {
                    'marker-size':'small',
                    'marker-color':feature.properties['marker-color']
                }
                var newOptions = {
                    'marker-size':'small',
                }
                var newColors = [
                    {'color': 'AAA922', 'id': '1'},
                    {'color': '218DB6', 'id': '2'},
                    {'color': 'D15A4B', 'id': '3'},
                    {'color': '689A46', 'id': '4'},
                    {'color': '0066a0', 'id': '5'}
                ]
                // Match focus area ID to newColors array
                _(newColors).each(function(color){
                    if (color.id == feature.properties.focus_area){
                       return newOptions['marker-color'] = color.color;
                    };
                })
                // Popup
                var clusterBrief = L.popup({
                        closeButton:false,
                        offset: new L.Point(0,-20)
                    }).setContent(view.clusterPopup(feature, subLocIndex));
                layer.on('mouseover',function(){
                    clusterBrief.setLatLng(this.getLatLng());
                    view.map.openPopup(clusterBrief);
                    layer.setIcon(L.mapbox.marker.icon(newOptions));
                }).on('mouseout',function(){
                    layer.setIcon(L.mapbox.marker.icon(oldOptions));
                    view.map.closePopup(clusterBrief);
                }).on('click',function(){
                    if (!view.options.embed){
                        var path = '#project/'+ feature.properties.project;
                        view.goToLink(path);
                    } else {
                        // open project page in a new tab/window
                        window.open(BASE_URL + '#project/'+ feature.properties.project)
                    }
                });
            };

            function filter(feature, layer, filter){// only two cases for type, hard code is fine
                var subFilter = mapFilter || "all",
                    precision = parseInt(feature.properties['precision']);

                if (subFilter === "all"){
                    return feature.properties
                } else if (subFilter === "country" ){
                    return precision === 6 || precision === 9
                } else if (subFilter === "subnational") {
                    return precision === 3 || precision === 4 || precision === 7 || precision === 8
                } else if (subFilter === "street"){
                    return precision === 1 || precision === 2 || precision === 5
                }
            };
            // Create a geoJSON with locations
            var filteredMarkersLayer = L.geoJson(filteredMarkers, {
                pointToLayer: L.mapbox.marker.style,
                onEachFeature: onEachFeature,
                filter: filter
            });
            // Add markers layer to the layer group titled view.markers
            view.markers.addLayer(filteredMarkersLayer);
            // Add view.markers to map
            view.map.addLayer(view.markers);
        }
    },
    renderCircles: function(layer,country){
        var view = this;
        var count, sources, budget, title, hdi, hdi_health, hdi_education, hdi_income,
            unit = view.collection,
            circles = [];
        // render HDI
        _(country.models).each(function(model){
            if (unit.operating_unit[model.id] && model.lon){
                count = unit.operating_unit[model.id];
                sources = (unit.donorID) ? false : unit.operating_unitSources[model.id];
                budget = (unit.donorID && _.size(unit.operating_unit)) ? unit.donorBudget[unit.donorID] : unit.operating_unitBudget[model.id];
                expenditure = (unit.donorID && _.size(unit.operating_unit)) ? unit.donorExpenditure[unit.donorID] : unit.operating_unitExpenditure[model.id];

                // Collect HDI data, create HDI graph view if filtered on a single operating_unit
                if ((HDI[model.id]) ? HDI[model.id].hdi != '' : HDI[model.id]) {
                    hdi = _.last(HDI[model.id].hdi)[1];
                    hdi_health = _.last(HDI[model.id].health)[1];
                    hdi_education = _.last(HDI[model.id].education)[1];
                    hdi_income = _.last(HDI[model.id].income)[1];
                    hdi_rank = HDI[model.id].rank;
                } else {
                    hdi = hdi_health = hdi_education = hdi_income = hdi_rank = 'no data';
                }

                // populate the centroid geojson
                model.centroid.properties.count = count;
                model.centroid.properties.sources = sources;
                model.centroid.properties.budget = budget;
                model.centroid.properties.expenditure = expenditure;
                model.centroid.properties.hdi = hdi;
                model.centroid.properties.popup = view.circlePopup(layer,model.centroid);
                model.centroid.properties.radius = util.radius(util.scale(layer,model.centroid));

                circles.push(model.centroid);
            }
        });
        var defaultCircle = {
            color:"#fff",
            weight:1,
            opacity:1,
            fillColor: "#0055aa",
            fillOpacity: 0.6
        };
        var circleLayer = L.geoJson({
            "type":"FeatureCollection",
            "features":_(circles).sortBy(function(f) { return -f.properties[layer]; })
        },{
            pointToLayer:function(feature,latlng){
                return L.circleMarker(latlng,defaultCircle).setRadius(feature.properties.radius);
            },
            onEachFeature:function(feature, layer){
                var brief = L.popup({
                        closeButton:false,
                        offset:[0, -feature.properties.radius+5]
                    }).setContent(feature.properties.popup);
                layer.on('mouseover',function(e){
                    brief.setLatLng(this.getLatLng());
                    view.map.openPopup(brief);
                    view.circleHighlight(e,{color:'#0055aa',weight:2});
                }).on('mouseout',function(e){
                    view.map.closePopup(brief);
                    view.circleHighlight(e);
                }).on('click',function(e){
                     if (!view.options.embed){
                        var prevPath = location.hash;
                    } else {
                        prevPath = location.hash.split('?')[0];
                        prevWidgetOpts = location.hash.split('?')[1]; // used when constructing the route with $('#widget-world')

                        $('#widget-world')
                        .removeClass('active')
                        .addClass('enabled')
                        .attr('href',location.origin + location.pathname + prevPath + "?"+ prevWidgetOpts)
                        .on('click',function(e){
                            $('#widget-country').removeClass('active');
                            $(e.target).addClass('active').removeClass('enabled');
                        })

                        $('#widget-country').addClass('active');
                    }

                    if (global.processedFacets.length === 0){
                        if (!view.options.embed) {
                            path = prevPath + '/filter/operating_unit-' + e.target.feature.properties.id;
                        } else {
                            // if there's no filter location hash is "#2013/widget/" which duplicates the "/"
                            path = prevPath = 'filter/operating_unit-' + e.target.feature.properties.id;
                        }
                    } else {
                        path = prevPath + '/operating_unit-' +  e.target.feature.properties.id;
                    }

                    view.goToLink(path);
                })
            }
        });
        view.markers.addLayer(circleLayer);
        view.map.addLayer(view.markers);
    }
});

Nationals = Backbone.Collection.extend({
    model: National,
    url: 'api/operating-unit-index.json'
});

Subnationals = Backbone.Collection.extend({
    model: Subnational,
    url: function() {
        var opUnitFilter =_(global.processedFacets).findWhere({collection:"operating_unit"});
        return 'api/units/' + opUnitFilter.id + '.json'
    },
    parse: function(response){
        return response.projects
    },
    filtered: function() {
        visible = this.filter(function(model) {
          return model.get("visible") === true;
        });
        return new Subnationals(visible);
    }
});

Facets = Backbone.Collection.extend({
    model:Facet,
    facets: [
        {
            id: 'operating_unit',
            url: 'api/operating-unit-index.json',
            name: 'Country Office / Operating Unit'
        },
        {
            id: 'region',
            url: 'api/region-index.json',
            name: 'Region'
        },
        {
            id: 'focus_area',
            url: 'api/focus-area-index.json',
            name: 'Themes'
        },
        {
            id: 'donor_countries',
            url: 'api/donor-country-index.json',
            name: 'Funding by Country'
        },
        {
            id: 'donors',
            url: 'api/donor-index.json',
            name: 'Budget Source'
        }
    ],
    initialize: function(){
        var that = this;

        // populate all facets
        _(this.facets).each(function(facet){
            that.push(facet);
        });
    }
});

Filters = Backbone.Collection.extend({
    model: Filter,
    watch: function() {
        this.update();
        global.projects.on('update', this.update, this);
    },
    update: function() {
        // in the Filters collection
        var collection = this,
            active = _(global.processedFacets).find(function(filter) {
                return (collection.id === filter.collection);
            });

        var activeCollection = collection.where({active:true});

        // set all models to be active: false
        _.each(activeCollection, function(model) {
            model.set('active', false);
        });

        if (active) {
            var model = this.get(active.id);
            var count = global.projects[collection.id][model.id];
            var budget = global.projects[collection.id + 'Budget'][model.id];
            var expenditure = global.projects[collection.id + 'Expenditure'][model.id];
            model.set({
                active: true,
                count: count,
                budget: budget,
                expenditure: expenditure
            });

        } else {
            collection.each(function(model) {
                var count = global.projects[collection.id][model.id];
                var budget = global.projects[collection.id + 'Budget'][model.id];
                var expenditure = global.projects[collection.id + 'Expenditure'][model.id];
                model.set({
                    count: count,
                    budget: budget,
                    expenditure: expenditure
                });
            });
        }
        this.trigger('update');
    },
    comparator: function(model) {
        return -1 * model.get('budget') || 0;
    }
});

Projects = Backbone.Collection.extend({
    // model: Project, -- model does not do anything here
    initialize: function() {
        this.sortData = this.sortData || 'budget';
        this.sortOrder = this.sortOrder || 'desc';
    },
    watch: function() {
        this.update();
        this.on('reset', this.update, this);
    },
    update: function() {
        var facets = new Facets().toJSON();
        var that = this,
            processes = 5 + facets.length,
            status = 0;

        if (!this.length) return false;

        // calculates the sum of the particular field
        function calc(collection,facet,category) {

            collection[facet + category.capitalize()] = _.reduce(collection.models, function(memo,model) {
                if (_.isArray(model.get(facet))) {
                    _.each(model.get(facet), function(o) {
                        if (!(o in memo)) {
                            memo[o] = model.get(category);
                        } else {
                            memo[o] += model.get(category);
                        }
                    });
                } else {

                    if (!(model.get(facet) in memo)) {
                        memo[model.get(facet)] = model.get(category);
                    } else {
                        memo[model.get(facet)] += model.get(category);
                    }
                }
                return memo;
            }, {});
        }

        // Count projects for each facet
        _(facets).each(function(facet) {
            setTimeout(function() {
                var subStatus = 0,
                    subProcesses = 1;

                if (facet.id == 'donor_countries') {
                    that[facet.id] = _(that.pluck(facet.id))
                        .chain()
                        .map(function(v) {
                            return _(v).uniq(true);
                        })
                        .flatten()
                        .countBy(function(n) { return n; })
                        .value();
                } else {
                    that[facet.id] = _(that.pluck(facet.id))
                        .chain()
                        .flatten()
                        .countBy(function(n) { return n; })
                        .value();

                    if (facet.id == 'operating_unit') {
                        that[facet.id + 'Sources'] = _(that.models).chain()
                            .groupBy(function(model) { return model.get(facet.id); })
                            .reduce(function(memo, models, unit) {
                                memo[unit] = _(models).chain().pluck('attributes').pluck('donors').flatten().uniq().size().value();
                                return memo;
                            }, {}).value();
                    }
                }

                // calculate the budget and expenditure for respective facet
                setTimeout(function() {
                    calc(that,facet.id,'budget');
                    if (subStatus === subProcesses) {
                        subCallback();
                    } else {
                        subStatus++;
                    }
                }, 0);

                setTimeout(function() {
                    calc(that,facet.id,'expenditure');
                    if (subStatus === subProcesses) {
                        subCallback();
                    } else {
                        subStatus++;
                    }
                }, 0);

                function subCallback() {
                    if (status === processes) {
                        callback();
                    } else {
                        status++;
                    }
                }

            }, 0);

        }, that);

        setTimeout(function() {
            // Total budget
            that.budget = that.reduce(function(memo, project) {
                return memo + parseFloat(project.get('budget'));
            }, 0);
            if (status === processes) {
                callback();
            } else {
                status++;
            }
        }, 0);

        setTimeout(function() {
            // Donor budgets
            that.donorBudget = that.reduce(function(memo, project) {
                _(project.get('donors')).each(function(donor, i) {
                    var budget = project.get('donor_budget')[i] || 0;
                    memo[donor] = memo[donor] +  budget || budget;
                });
                return memo;
            }, {});
            if (status === processes) {
                callback();
            } else {
                status++;
            }
        }, 0);
        
        setTimeout(function() {
            // Funding by Country budgets
            that.ctryBudget = that.reduce(function(memo, project) {
                _(project.get('donor_countries')).each(function(donor, i) {
                    var budget = project.get('donor_budget')[i] || 0;
                    memo[donor] = memo[donor] +  budget || budget;
                });
                return memo;
            }, {});
            if (status === processes) {
                callback();
            } else {
                status++;
            }
        }, 0);

        setTimeout(function() {
            // Total expenditure
            that.expenditure = that.reduce(function(memo, project) {
                return memo + parseFloat(project.get('expenditure'));
            }, 0);
            if (status === processes) {
                callback();
            } else {
                status++;
            }

        }, 0);

        setTimeout(function() {
            // Donor expenditure
            that.donorExpenditure = that.reduce(function(memo, project) {
                _(project.get('donors')).each(function(donor, i) {
                    var budget = project.get('donor_expend')[i] || 0;
                    memo[donor] = memo[donor] +  budget || budget;
                });
                return memo;
            }, {});
            if (status === processes) {
                callback();
            } else {
                status++;
            }

        }, 0);
        
        setTimeout(function() {
            // Funding by Country expenditure
            that.ctryExpenditure = that.reduce(function(memo, project) {
                _(project.get('donor_countries')).each(function(donor, i) {
                    var budget = project.get('donor_expend')[i] || 0;
                    memo[donor] = memo[donor] +  budget || budget;
                });
                return memo;
            }, {});
            if (status === processes) {
                callback();
            } else {
                status++;
            }

        }, 0);
        
        function callback() {
            that.trigger('update');
            _(that.cb).bind(that)();
        }

    },
    comparator: function(model) {
        if (this.sortOrder == 'desc') {
            if (this.sortData == 'name') {
                return -model.get(this.sortData).toLowerCase().charCodeAt(0);
            } else {
                return -model.get(this.sortData);
            }    
        } else {
            return model.get(this.sortData);
        }
    } 
});

TopDonors = Backbone.Collection.extend({
    model: TopDonor,
    initialize: function(options) {
        this.type = options.type;
    },
    
    comparator: function(model) {
        return -1 * model.get(this.type);
    }
});

TotalModalities = Backbone.Collection.extend({
    model: Modality,
    url: 'api/donors/total-modality.json'
})

DonorModalities = Backbone.Collection.extend({
    model: Modality,
    url: 'api/donors/donor-modality.json'
})

Countries = Backbone.Collection.extend({
    model: Country,
    url: 'api/world.json'
});

India = Backbone.Collection.extend({
    model: Country,
    url: 'api/india_admin0.json'
});

OperatingUnits = Backbone.Model.extend({
    model:OperatingUnit,
    url: 'api/operating-unit-index.json'
});

SubnationalIndices = Backbone.Model.extend({
    model:SubnationalIndex,
    url: 'api/subnational-locs-index.json'
});
FocusAreaIndices = Backbone.Model.extend({
    model:FocusAreaIndex,
    url: 'api/focus-area-index.json'
});
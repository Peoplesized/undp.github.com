Projects = Backbone.Collection.extend({
    initialize: function() {
        this.sortData = this.sortData || 'budget';
        this.sortOrder = this.sortOrder || 'desc';
    },
    watch: function() {
        this.update();
        this.on('reset', this.update, this);
    },
    getSumFacet:function(facetName){
        var valuesUnderFacetName = this.pluck(facetName);
        var sumValues = _.chain(valuesUnderFacetName)
            .chain()
            .flatten()
            .countBy();

        return sumValues.value()
    },
    getDonorCountires:function(){
        var allDonorCountires = this.pluck('donor_countries'); //array of arrays

        var sumDonorCountries = _.chain(allDonorCountires)
            .map(function(donorId){ return _.uniq(donorId);})
            .flatten()
            .countBy();

        return sumDonorCountries.value()
    },
    getUnitSources:function(){
        // the sum of the number of donors
        // under each operating unit for selected proejcts
        // if there are two units, its the sum of the two
        // if it's part of the projects under the unit
        // donor numbers change accordingly
        var groupedByUnit = this.groupBy(function(m){return m.get('operating_unit');});

        var sumDonorsUnderUnit = _.chain(groupedByUnit)
            .reduce(function(memo, modelsUnderUnit, unit) {
                memo[unit] = _.chain(modelsUnderUnit)
                    .map(function(m){return m.get('donors')}) // returns arrays
                    .flatten()
                    .uniq()
                    .size()
                    .value();
                return memo;
            }, {});

        return sumDonorsUnderUnit.value()
    },
    calc: function(collection,facet,category){
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
    },
    update: function() {
        var facets = new Facets().idsOnly(); // donors, donor_countries, operating_unit, focus_area, region

        var that = this,
            processes = 5 + facets.length,
            status = 0;

        if (!this.length) return false;

        // calculate needed value to populate filters, circles and summary fields
        that['donors'] = that.getSumFacet('donors');
        that['focus_area'] = that.getSumFacet('focus_area')
        that['region'] = that.getSumFacet('region')
        that['operating_unit'] = that.getSumFacet('operating_unit')
        that['donor_countries'] = that.getDonorCountires();

        // "Budget Sources" in summary
        that['operating_unitSources'] = this.getUnitSources();        

        // Count projects for each facet
        _(facets).each(function(facet) {

            setTimeout(function() {
                var subStatus = 0,
                    subProcesses = 1;

                setTimeout(function() {
                    that.calc(that,facet,'budget');
                    if (subStatus === subProcesses) {
                        subCallback();
                    } else {
                        subStatus++;
                    }
                }, 0);

                setTimeout(function() {
                    that.calc(that,facet,'expenditure');
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

        }, this);

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
            _.bind(that.cb,that)();
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
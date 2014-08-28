Projects = Backbone.Collection.extend({
    initialize: function() {
        this.sortData = this.sortData || 'budget';
        this.sortOrder = this.sortOrder || 'desc';
    },
    watch: function() {
        this.update();
        this.on('reset', this.update, this);
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
    getUnitSources:function(){
        collection['operating_unitSources']
    },
    update: function() {
        var facets = new Facets().toJSON();
        var that = this,
            processes = 5 + facets.length,
            status = 0;

        if (!this.length) return false;

        // Count projects for each facet
        _(facets).each(function(facet) {
            setTimeout(function() {
                var subStatus = 0,
                    subProcesses = 1;

                // prepare the attributes of the collections
                // donor_countries is an array
                if (facet.id === 'donor_countries') {
                    that[facet.id] = _(that.pluck(facet.id))
                        .chain()
                        .map(function(v) {
                            return _(v).uniq(true);
                        })
                        .flatten()
                        .countBy(function(n) { return n; })
                        .value();
                } else {
                    // other facets are objects
                    that[facet.id] = _(that.pluck(facet.id))
                        .chain()
                        .flatten()
                        .countBy(function(n) { return n; })
                        .value();

                    if (facet.id === 'operating_unit') {
                        that[facet.id + 'Sources'] = _(that.models).chain()
                            .groupBy(function(model) { return model.get(facet.id); })
                            .reduce(function(memo, models, unit) {
                                memo[unit] = _(models).chain()
                                .pluck('attributes')
                                .pluck('donors')
                                .flatten()
                                .uniq()
                                .size()
                                .value();
                                return memo;
                            }, {}).value();
                    }
                }

                setTimeout(function() {
                    that.calc(that,facet.id,'budget');
                    if (subStatus === subProcesses) {
                        subCallback();
                    } else {
                        subStatus++;
                    }
                }, 0);

                setTimeout(function() {
                    that.calc(that,facet.id,'expenditure');
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

TopDonors = Backbone.Collection.extend({
    model: TopDonor,
    initialize: function(options) {
        this.type = options.type;
    },
    
    comparator: function(model) {
        return -1 * model.get(this.type);
    }
});
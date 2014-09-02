Projects = Backbone.Collection.extend({
    initialize: function() {
        this.sortData = this.sortData || 'budget';
        this.sortOrder = this.sortOrder || 'desc';
    },
    watch: function() {
        this.update();
        this.on('reset', this.update, this);
    },
    getSumValuesOfFacet:function(facetName){
        // the sum of the values from selected facet
        // applies to focus_area, region and operating_unit
        var valuesUnderFacetName = this.pluck(facetName);  // returns values
        var sumValues = _.chain(valuesUnderFacetName)
            .chain()
            .flatten()
            .countBy();

        return sumValues.value()
    },
    getDonorCountires:function(){
        // the sum of donor countries
        // donor countries is an array associated with a project
        var allDonorCountires = this.pluck('donor_countries'); // returns arrays

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
    addFinance: function(keyUnderFacet,memoObject,finance){
        if (!(keyUnderFacet in memoObject)) {
            memoObject[keyUnderFacet] = finance
        } else {
            memoObject[keyUnderFacet] += finance
        }
    },
    getBudgetAndExpenseOfFacet: function(collection,facetName,category){ // category is "budget" or "expenditure"
        // the sum of budget (or expenditure) of respective facet
        // for example: donor_countriesBudget is the budget sum of
        // the category is capitalized here
        var facetCategory = facetName + category.capitalize(),
            facetSubkey,
            projectFinance;

        // Populate the new key/value associated with the Projects collection
        collection[facetCategory] = _.reduce(collection.models, function(memo,model) {

            facetSubkey = model.get(facetName),
            projectFinance = model.get(category);

            if (_.isArray(facetSubkey)) {

                _.each(facetSubkey, function(key){
                    this.addFinance(key,memo,projectFinance);
                },this); // scope binding to _.each

            } else {

                this.addFinance(facetSubkey,memo,projectFinance);

            }

            return memo
        }, {}, this); // scope binding to _.reduce
    },
    update: function() {
        var facets = new Facets().idsOnly(); // donors, donor_countries, operating_unit, focus_area, region

        // var processes = 5 + facets.length,
        //     status = 0;

        if (!this.length) return false;

        // calculate needed value to populate filters, circles and summary fields

        this['donors'] = this.getSumValuesOfFacet('donors');
        this['focus_area'] = this.getSumValuesOfFacet('focus_area')
        this['region'] = this.getSumValuesOfFacet('region')
        this['operating_unit'] = this.getSumValuesOfFacet('operating_unit')
        this['donor_countries'] = this.getDonorCountires();

        // "Budget Sources" in summary
        this['operating_unitSources'] = this.getUnitSources();

        // calculate budgets and expenditures associated with each facet
        _.each(facets,function(facet){
            this.getBudgetAndExpenseOfFacet(this,facet,'budget');
            this.getBudgetAndExpenseOfFacet(this,facet,'expenditure');
        },this);

        // calculate general budgets and expenditures 
        this['budget'] = this.reduce(function(memo, model) {
            return memo + parseFloat(model.get('budget'));
        },0,this);

        this['expenditure'] = this.reduce(function(memo, model) {
            return memo + parseFloat(model.get('expenditure'));
        }, 0,this);


        // IMPORTANT what's the difference between donorBudget vs donorsBudget??
        // donorBudget is used for the Top Budget Sources Chart
        // donorsBudget affects Filters collection WIP

        this['donorBudget'] = this.reduce(function(memo, model) {
            _.each(model.get('donors'),function(donor, i) {
                var budget = model.get('donor_budget')[i] || 0;
                    memo[donor] = memo[donor] + budget || budget;
            },this);
            return memo;
        }, {},this);

        this['donorExpenditure'] = this.reduce(function(memo, model) {
            _.each(model.get('donors'),function(donor, i) {
                var budget = model.get('donor_expend')[i] || 0;
                memo[donor] = memo[donor] +  budget || budget;
            },this);
            return memo;
        }, {},this);

        this['ctryBudget'] = this.reduce(function(memo, model) {
            _.each(model.get('donor_countries'),function(donor, i) {
                var budget = model.get('donor_budget')[i] || 0;
                memo[donor] = memo[donor] + budget || budget;
            },this);
            return memo;
        }, {},this);

        this.ctryExpenditure = this.reduce(function(memo, model) {
            _.each(model.get('donor_countries'),function(donor, i) {
                var budget = model.get('donor_expend')[i] || 0;
                memo[donor] = memo[donor] +  budget || budget;
            },this);
            return memo;
        }, {},this);

        this.trigger('update');
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
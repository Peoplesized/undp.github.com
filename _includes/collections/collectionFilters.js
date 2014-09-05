// In Filters the whole list of global projects are being processed
// to fit the processedFacets
Filters = Backbone.Collection.extend({
    model: Filter,
    watch: function() {
        // this === facet and its subfilters
        this.update();
        this.on('update', this.update, this);
    },
    update: function() {

        // global.processedFacets {facet:"operating_unit",id:"AFG"}
        // use findWhere instead of find to be consistent with the rest of the site
        var activeFacet = _.findWhere(global.processedFacets, {facet: this.id}); 

        // if there is no filters selected
        // get all the models and aggregate all facets
        if (!activeFacet) {
            this.each(function(model) {
                model.set({
                    count: this.aggregate(model).count,
                    budget: this.aggregate(model).budget,
                    expenditure: this.aggregate(model).expenditure
                });
            },this);
        // if these is a filter
        // set that filter as active
        } else {
            var subfilter = this.get(activeFacet.id);
            subfilter.set({
                active: true,
                count: this.aggregate(subfilter).count,
                budget: this.aggregate(subfilter).budget,
                expenditure: this.aggregate(subfilter).expenditure,
            });
            debugger
        }

        this.trigger('update');
    },
    aggregate: function(m){
        var count = global.projects[this.id][m.id];
        var budget = global.projects[this.id + 'Budget'][m.id];
        var expenditure = global.projects[this.id + 'Expenditure'][m.id];
        return {
            'count': count,
            'budget': budget,
            'expenditure':expenditure
        }
    },
    comparator: function(model) {
        return -1 * model.get('budget') || 0;
    }
});
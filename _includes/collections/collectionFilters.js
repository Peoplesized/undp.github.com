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
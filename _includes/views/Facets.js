views.Facets = Backbone.View.extend({
	el: '#filter-items',
	template:_.template('<div id="<%= id %>" class="topics"></div>'),
	initialize:function(){
		this.collection = new Facets();
		this.render();
	},
	render:function(){
		var that = this;
		var facetHTML = '';

		global.app.views = {}; // what is the views

		// create the topics divs
		this.collection.each(function(facet){
			facetHTML += that.template(facet);

			facet.subFilters.fetch({
				success: function (data) {
					global.app.views[facet.id] = new views.Filters({
					el: '#' + facet.id,
					collection: facet.subFilters
				});

				_.each(global.processedFacets, function (obj) {
					if (obj.collection === facet.id) {
				 		global.app.views[facet.id].active = true;
					}
				});
				facet.subFilters.watch();

				// that.counter++;
				// if (that.counter === facets.length) updateDescription();
				}
			});
		})

		this.$el.html(facetHTML);
	}
});
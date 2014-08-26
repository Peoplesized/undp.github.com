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

		// a global object to host one view for each facet
		// in their respective element
		global.allFacetViews = {}

		this.collection.each(function(facet){
			facetHTML += that.template(facet);

			facet.subFilters.fetch({
				success: function (data) {
				global.allFacetViews[facet.id] = new views.Filters({
					el: '#' + facet.id, // element name is created based on the facet name
					collection: facet.subFilters
				});

				_.each(global.processedFacets, function (obj) {
					if (obj.collection === facet.id) {
						global.allFacetViews[facet.id].active = true
					}
				});
				facet.subFilters.watch();

				// that.counter++;
				// if (that.counter === facets.length) updateDescription();
				}
			});
		})

		this.$el.html(facetHTML); // create the topics/facets divs
	}
});
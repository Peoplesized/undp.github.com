views.Facets = Backbone.View.extend({
	el: '#filter-items',
	template:_.template($('#facet').html()),
	initialize:function(){
		_.bindAll(this,'render');
		this.collection = new Facets();
		this.render();
	},
	render:function(){
		var facetHTML = '';

		// a global object to host one view for each facet
		// in their respective element
		// this can be cleaned up
		global.allFacetViews = {}

		this.collection.each(function(facet){

			facetHTML += this.template({
				id: facet.get('id'),
				name: facet.get('name')
			});

			// set up filters (values in the collection) for the facet
	        facet.subFilters = new Filters();

	        facet.subFilters.id = facet.get('id');
	        facet.subFilters.name = facet.get('name');
	        facet.subFilters.url = facet.get('url');

	        // new views.Filters({
	        // 	el:'#' + facet.id,
	        // 	collection: facet.subFilters
	        // })

			facet.subFilters.fetch({
				success: function () {
				// global.allFacetViews[facet.id] = new views.Filters({ // views.Filters is being reused
				// 	el: '#' + facet.id, // element name is created based on the facet name
				// 	collection: facet.subFilters
				// });

				// search in processedFacets if current facet is selected
				// if (global.processedFacets.indexOf(facet.id) > -1) {
				// 	// if so, the facet is "active"
				// 	global.allFacetViews[facet.id].active = true
				// }


		        new views.Filters({
					el:'#' + facet.id,
					collection: facet.subFilters
		        })
				facet.subFilters.watch();

				}
			});

		},this) // ensure the context refers to the view, so that var that = this is not needed

		this.$el.html(facetHTML); // create the topics/facets divs
	}
});
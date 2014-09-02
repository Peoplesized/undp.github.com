views.Facets = Backbone.View.extend({
	el: '#filter-items',
	template:_.template('<div id="<%= id %>" class="topics"></div>'),
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
			facetHTML += this.template(facet);

			facet.subFilters.fetch({
				success: function (data) {
				global.allFacetViews[facet.id] = new views.Filters({ // views.Filters is being reused
					el: '#' + facet.id, // element name is created based on the facet name
					collection: facet.subFilters
				});

				// search in processedFacets if current facet is selected
				if (global.processedFacets.indexOf(facet.id) >=0) {
					// if so, the facet is "active"
					// the active value is being used in Filters etc
					// WHY using the view as true 
					global.allFacetViews[facet.id].active = true
				}

				facet.subFilters.watch();

				}
			});

		},this) // ensure the context refers to the view, so that var that = this is not needed

		this.$el.html(facetHTML); // create the topics/facets divs
	}
});
views.Description = Backbone.View.extend({
	el: '#desc',
	initialize: function(options){

		this.unit = _(global.processedFacets).findWhere({collection:"operating_unit"}),
		this.donorCountry = _(global.processedFacets).findWhere({'collection':'donor_countries'}),

		this.clearSearch();
		$('#browser .summary').removeClass('off');

	},
	singlePlural:function(){
		var single = 'project',
			plural = 'projects',
			fundSingle = 'funds',
			fundPlural = 'fund',
			count,
			fund;

		if (global.projects.length > 1) {
			projectCount = plural;
		} else {
			projectCount = single;
		}

		if (donorCountry === 'MULTI_AGY' || donorCountry === 'OTH'){
			// donorCountry = 'Multi-Lateral Agencies';
			// donorCountry = 'Uncategorized Organizations'
			fund = fundPlural;
		} else {
			fund = fundSingle
		}

		return {
			"projectCount": count,
			"fund" : fund
		}
	},
	clearSearch:function(){
		// $('#filters-search, #projects-search').val('');
		debugger
		// theme table does not display when theme is selected
		// TODO move this somewhere else
		if (this.theme != undefined) {
		    $('#chart-focus_area').hide();
		} else {
		    $('#chart-focus_area').show();
		}
	},
	render:function(){

	}
})
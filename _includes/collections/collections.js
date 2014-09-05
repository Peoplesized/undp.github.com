Nationals = Backbone.Collection.extend({
    model: National,
    url: 'api/operating-unit-index.json'
});

Subnationals = Backbone.Collection.extend({
    model: Subnational,
    url: function() {
        var opUnitFilter =_(global.processedFacets).findWhere({collection:"operating_unit"});
        return 'api/units/' + opUnitFilter.id + '.json'
    },
    parse: function(response){
        return response.projects
    },
    filtered: function() {
        visible = this.filter(function(model) {
          return model.get("visible") === true;
        });
        return new Subnationals(visible);
    }
});

Facets = Backbone.Collection.extend({
    model:Facet,
    facets: [
        {
            id: 'operating_unit',
            url: 'api/operating-unit-index.json',
            name: 'Country Office / Operating Unit'
        },
        {
            id: 'region',
            url: 'api/region-index.json',
            name: 'Region'
        },
        {
            id: 'focus_area',
            url: 'api/focus-area-index.json',
            name: 'Themes'
        },
        {
            id: 'donor_countries',
            url: 'api/donor-country-index.json',
            name: 'Funding by Country'
        },
        {
            id: 'donors',
            url: 'api/donor-index.json',
            name: 'Budget Source'
        }
    ],
    initialize: function(){
        // populate all facets
        // with predefined values
        _(this.facets).each(function(facet){
            this.push(facet);
        },this);
    },
    idsOnly: function(){
        return this.map(function(m){return m.get('id');});
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

TotalModalities = Backbone.Collection.extend({
    model: Modality,
    url: 'api/donors/total-modality.json'
})

DonorModalities = Backbone.Collection.extend({
    model: Modality,
    url: 'api/donors/donor-modality.json'
})

Countries = Backbone.Collection.extend({
    model: Country,
    url: 'api/world.json'
});

India = Backbone.Collection.extend({
    model: Country,
    url: 'api/india_admin0.json'
});

OperatingUnits = Backbone.Model.extend({
    model:OperatingUnit,
    url: 'api/operating-unit-index.json'
});

SubnationalIndices = Backbone.Model.extend({
    model:SubnationalIndex,
    url: 'api/subnational-locs-index.json'
});
FocusAreaIndices = Backbone.Model.extend({
    model:FocusAreaIndex,
    url: 'api/focus-area-index.json'
});
National = Backbone.Model.extend({
    initialize:function(){
        this.lon = this.get('lon'),
        this.lat = this.get('lat');
        this.centroid = {
            "type":"Feature",
            "properties":{
                "id":this.get('id'),
                "title":this.get('name')
            },
            "geometry":{
                "type":"Point",
                "coordinates":[parseFloat(this.lon),parseFloat(this.lat)]
            }
        };
    }
});

Subnational = Backbone.Model.extend({ // the model is a country with subcollection
    defaults: {visible:false},
    initialize:function(){
        var that = this,
            subnational = this.get('subnational');

        subnational.length === 0 ? this.geojson = null : this.geojson = [];

        if (subnational.length > 0 ) {
            _(subnational).each(function(data){
                
                var feature = {
                    "type":"Feature",
                    "properties":{
                        project:that.get('id'),
                        output_id: data.outputID,
                        title:that.get('title'),
                        precision: data.precision,
                        scope: data.scope,
                        focus_area: data.focus_area,
                        focus_descr: data.focus_area_descr,
                        type: data.type,
                        'marker-size': 'small'
                        },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [parseFloat(data.lon),parseFloat(data.lat)]
                        }
                    };
                that.geojson.push(feature);
            })
        }
    }
});

Filter = Backbone.Model.extend({
    defaults: {
        active: false,
        visible: true
    },
    initialize: function() {
        if (this.collection.id === 'donors' && this.id === '00012') {
            this.set({ name: 'UNDP Regular Resources' }, { silent: true });
        }
    }
});

Project = Backbone.Model.extend({
    defaults: { visible: true },
    url: function() {
        return 'api/projects/' + this.get('id') + '.json';
    }
});

Facet = Backbone.Model.extend({
    defaults: {
        id:'',
        name:'',
        url:''
    },
    initialize: function(){
        var that = this;
        // start the filters under each Facet model
        this.subFilters = new Filters();

        // the subCollection (aka Filters) inherit the facets fields
        this.subFilters.id = this.get('id');
        this.subFilters.name = this.get('name');
        this.subFilters.url = this.get('url');
    }
});

TopDonor = Backbone.Model.extend({});
Modality = Backbone.Model.extend({});

Country = Backbone.Model.extend({});

OperatingUnit = Backbone.Model.extend({});
SubnationalIndex = Backbone.Model.extend({});
FocusAreaIndex = Backbone.Model.extend({});
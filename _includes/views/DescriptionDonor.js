views.DescriptionDonor = Backbone.View.extend({



	// if (global.donorDescription.length > 0) {
		// 	// new views.DescriptionDonor();
	//     // default donor text
	//     $('#description').find('#desc').html(global.donorDescription + counts +' across the world.');
	//     // donor viz h3
	//     $('#donor-title').html(global.donorTitle);
	// } 

	el: '#donor-specific',
	initiate:function(){
	    this.$el.empty();
	    this.$el.append(templates.donorSpecific(app));
	    this.$el.find('.spin').spin({ color:'#000' });

	    _(this.$el.find('img')).each(function(img){
	        var caption = $('<p class="photo-caption">'+img.alt+'</p>')
	        caption.insertAfter(img);
	        caption.prev().andSelf().wrapAll('<div class="slide" />');
	    });
	    $('.slide').wrapAll('<div id="slides" />');
	    $('#slides', this.$el).slidesjs({
	        pagination:{active:false},
	        callback: {
	            loaded: function(number) {
	                this.$el.find('.spin').remove();
	            }
	        }
	    });
	}
});
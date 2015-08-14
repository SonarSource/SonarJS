// an implementation of Rails' in_groups_of method
// Splits an array into groups of a fixed size.
//
// Useful for distributing an array's values into
// a table
//
//
//  _.inGroupsOf( [1,2,3,4,5,6,7], 3 );
//
//  returns:
//     [ 1, 2, 3 ]
//     [ 4, 5, 6 ]
//     [ 7, null, null ]

(function(window,underscore,undefined){

  underscore.inGroupsOf = function( obj, per_row_size, fill_with ){
    if ( underscore.isUndefined( fill_with ) ){
      fill_with = null;
    }
    var results=[], row=[];
    underscore.each( obj,function( value,index, col ){
      if ( row.length >= per_row_size ){
        results.push( row );
        row = [];
      }
      row.push( value );
    });


    if ( Math.abs( obj.length / per_row_size ) ){
      row=[];
      var start = results.length * per_row_size;
      for ( var x=0; x<per_row_size; x++ ){
        row.push( underscore.isUndefined( obj[start+x] ) ? fill_with : obj[start+x] );
      }
      results.push( row );
    }
    return results;
  };

})( window, _ );

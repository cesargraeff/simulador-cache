(function(){
    'use strict';

    angular.module('cache').filter('quadrado',function(){
        return function(input){
            if(!input && input !== 0){
                return 0;
            }else{
                return Math.pow(2,input);
            }

        };
    });
})();
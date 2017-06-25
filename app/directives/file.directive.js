(function(){
    'use strict';

    angular.module('cache').directive('fileSelect', ['$window', function ($window) {
        return {
            restrict: 'A',
            scope:{
              'file' : "="
            },
            require: 'ngModel',
            link: function (scope, el, attr, ctrl) {
                var fileReader = new $window.FileReader();

                fileReader.onload = function () {
                    ctrl.$setViewValue(fileReader.result);
                };

                fileReader.onerror = function () {
                    alert('ERRO AO FAZER UPLOAD DO ARQUIVO: '+fileReader.error);
                };

                el.bind('change', function (e) {
                    var fileName = e.target.files[0];
                    scope.file = fileName.name;
                    fileReader.readAsText(fileName);
                });
            }
        };
    }]);

})();
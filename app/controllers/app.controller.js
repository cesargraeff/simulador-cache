(function(){
    'use strict';

    angular.module('cache').controller('AppController',AppController);

    AppController.$inject = ['$scope','$q','$timeout'];

    function AppController($scope,$q,$timeout){

        var vm = this;
        vm.processar = processar;

        function processar(params){
            $scope.loading = true;
            $timeout(function(){
                executa(params).then(function(){
                    $scope.loading = false;
                });
            },100);
        }

        function executa(params){

            var q = $q.defer();

            if(verificar(params)){

                vm.resultados = {
                    linhas_arquivo: 0,
                    linhas_processadas: 0,
                    escritas_arquivo: 0,
                    leituras_arquivo: 0,
                    escritas: 0,
                    leituras: 0,
                    cache: {
                        leituras: 0,
                        escritas: 0
                    },
                    memoria: {
                        leituras: 0,
                        escritas: 0
                    }
                };

                vm.cache = {};

                var linhas = params.file.split('\n');
                vm.resultados.linhas_arquivo = linhas.length;
                if(linhas[linhas.length - 1] == '')  vm.resultados.linhas_arquivo--;

                linhas.forEach(function(value){
                    if(value){
                        // DECODIFICAÇÃO DA LINHA
                        var operacao = value.substr(9,1);
                        var endereco = converte_bin(value.substr(0,8),32);

                        // DECODIFICAÇÃO DO ENDEREÇO
                        var conjunto = params.num_linhas - params.linhas_conjunto;
                        var tag = 32 - ((params.num_linhas - params.linhas_conjunto) + params.tam_linha);
                        conjunto = endereco.substr(tag,conjunto);
                        tag = endereco.substr(0,tag);

                        if(!vm.cache[conjunto]) vm.cache[conjunto] = {};

                        if(operacao == 'W'){
                            vm.resultados.escritas_arquivo++;
                        }else{
                            vm.resultados.leituras_arquivo++;
                        }

                        var write = 0;
                        if(operacao == 'W'){
                            vm.resultados.escritas++;

                            if(vm.cache[conjunto][tag]){
                                vm.resultados.cache.escritas++;
                                vm.cache[conjunto][tag].dirty = 1;
                                vm.cache[conjunto][tag].ultima_linha = vm.resultados.linhas_processadas;
                                vm.cache[conjunto][tag].acessos++;
                            }else{
                                write = 1;
                                operacao = 'R';
                            }

                            // WRITE-THROUGTH
                            if(params.politica_escrita == 0){
                                vm.resultados.memoria.escritas++;
                            }
                        }

                        if(operacao == 'R'){

                            if(write == 0)
                                vm.resultados.leituras++;

                            if(!vm.cache[conjunto][tag]){

                                vm.resultados.memoria.leituras++;
                                if(Object.keys(vm.cache[conjunto]).length >= Math.pow(2,params.linhas_conjunto)){
                                    if(params.politica_substituicao == 2) {
                                        // RANDOM
                                        var indice = Math.floor((Math.random() * (Object.keys(vm.cache[conjunto]).length - 1)));
                                        var i = 0;
                                        angular.forEach(vm.cache[conjunto],function(v,t){
                                            if(i == indice){
                                                // WRITE-BACK
                                                if(params.politica_escrita == 1 && vm.cache[conjunto][t].dirty == 1){
                                                    vm.resultados.memoria.escritas++;
                                                }
                                                delete vm.cache[conjunto][t];
                                            }
                                            i++;
                                        });
                                    }else{
                                        var rotulo,menor;
                                        angular.forEach(vm.cache[conjunto], function (v, t) {
                                            if (params.politica_substituicao == 1) {
                                                // LRU
                                                if(!menor){
                                                    menor = v.ultima_linha;
                                                    rotulo = t;
                                                }

                                                if(v.ultima_linha < menor) {
                                                    menor = v.ultima_linha;
                                                    rotulo = t;
                                                }
                                            } else {
                                                // LFU
                                                if(!menor){
                                                    menor = v.acessos;
                                                    rotulo = t;
                                                }
                                                if(v.acessos < menor) {
                                                    menor = v.acessos;
                                                    rotulo = t;
                                                }
                                            }
                                        });
                                        if (rotulo){
                                            if(params.politica_escrita == 1 && vm.cache[conjunto][rotulo].dirty == 1){
                                                vm.resultados.memoria.escritas++;
                                            }
                                            delete vm.cache[conjunto][rotulo];
                                        }
                                    }
                                }
                                vm.cache[conjunto][tag] = {
                                    acessos: 0,
                                    ultima_linha: vm.resultados.linhas_processadas,
                                    dirty : write
                                };
                            }else{
                                vm.cache[conjunto][tag].ultima_linha = vm.resultados.linhas_processadas;
                                vm.cache[conjunto][tag].acessos++;
                                vm.resultados.cache.leituras++;
                            }
                        }
                        vm.resultados.linhas_processadas++;
                    }
                });

                if(params.politica_escrita == 1){
                    angular.forEach(vm.cache,function(v,conjunto){
                        angular.forEach(vm.cache[conjunto],function(v,tag){
                            // WRITE-BACK
                            if(vm.cache[conjunto][tag].dirty == 1){
                                vm.resultados.memoria.escritas++;
                            }
                        });
                    });
                }
            }

            var acerto = (vm.resultados.cache.escritas + vm.resultados.cache.leituras) / (vm.resultados.escritas + vm.resultados.leituras);
            vm.resultados.tempo_medio = acerto * params.cache_hit + (1-acerto)*(params.cache_hit + params.mp_hit);

            q.resolve();

            return q.promise;
        }

        function verificar(params){
            var message;

            iziToast.destroy();

            if(!params.tam_linha && params.linhas_conjunto != 0){
                message = 'Informe o tamanho da linha';
            }else if(!params.num_linhas && params.linhas_conjunto != 0){
                message = 'Informe o numero de linhas';
            }else if(!params.linhas_conjunto && params.linhas_conjunto != 0){
                message = 'Informe o numero de linhas por conjunto';
            }else if(!params.cache_hit){
                message = 'Informe o tempo de hit da cache';
            }else if(!params.politica_escrita){
                message = 'Informe a politica de escrita';
            }else if(!params.politica_substituicao){
                message = 'Informe a politica de substituição';
            }else if(!params.mp_hit){
                message = 'Informe o tempo de hit da memória principal';
            }else if (!params.file){
                message = 'Informe o arquivo a ser processado';
            }

            if(message){
                iziToast.error({
                    position: 'topCenter',
                    message: message.toUpperCase()
                });
                return false;
            }else{
                return true;
            }
        }

        function converte_bin(value,tam){
            value = parseInt(value, 16).toString(2);
            while(value.length < tam) value = "0"+value;
            return value;
        }

    }

})();
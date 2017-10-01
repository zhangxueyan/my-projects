"use strict";
$(function () {
    Vue.filter('dateFormat', function (ts ) {
        if(ts > 0){
            var date = new Date(ts);
            return date.format("yyyy/MM/dd");
        }
    })

    Vue.filter('dateFormat_HHmmss', function (ts ) {
        if(ts > 0) {
            var date = new Date(ts);
            return date.format("HH:mm:ss");
        }
    })

    Vue.filter('dateFormat_iso', function (ts ) {
        if(ts > 0) {
            var date = new Date(ts);
            return date.format("yyyy/MM/dd mm:HH:ss");
        }
    })


    var $page = $("#pagination");
    if($page.length == 0) {
        console.error("#pagination is not exist")
        return
    }

    var $APPLeList = $("#AppDataList");
    if($APPLeList.length == 0) {
        console.error("#AppDataList is not exist")
        return;
    }

    var url = $APPLeList.data("url")
    var count_url = $APPLeList.data("count-url")
    var delete_url = $APPLeList.data("delete-url")
    var select_fields = $APPLeList.data('select-fields')
    var group = $(".btn[data-group]", $APPLeList).data('group')
    var groups = $(".btn[data-groups]", $APPLeList).data('groups')

    var paramsKey =  location.href;

    if(typeof VueImgLoader != 'undefined'){
        // register VueImgLoader
        Vue.component('vue-img-loader', VueImgLoader);
    }

    var AppLeList = new Vue({
        el: $APPLeList[0],
        data: {
            loading: null,
            itemList: null,
            total: 0, selectAll: 0, selectFields: [],
            params: { page:1, pageSize: 15, searchKey: null},
            groups:{}
        },

        mounted: function () {
            this.$nextTick(function () {
                var vm = this;

                if(select_fields){
                    vm.selectFields = _.filter(select_fields.split(","),  function(v){ return  v })
                }

                var vTags = $("[data-tag=vue]", $APPLeList)
                $.each(vTags, function (i, n) {
                    var m = $(n).attr('name')
                    var v = $(n).data('value')
                    Vue.set(vm.params, m, v)
                    console.log("v-model:", m, v)
                })


                if(typeof ($APPLeList.attr('autoload')) != 'undefined' || this.loadParams()){
                    //page size
                    if($page.data('pagesize')){
                        vm.params['pageSize'] = $page.data('pagesize')
                    }

                    this.search()
                }
            })
        },

        computed: {
            isEmpty: function () {
               return this.itemList && this.itemList.length < 1
            },

            isSelectAll: function () {
                return this.getSelectAll() == 1
            },

            rows: function () {
                if(this.itemList)
                    return this.itemList.length;
                else
                    return 0
            }
        },

        methods:{
             formatSeconds: function(value) {
                var theTime = parseInt(value);// 秒
                var theTime1 = 0;// 分
                var theTime2 = 0;// 小时
                if(theTime > 60) {
                    theTime1 = parseInt(theTime/60);
                    theTime = parseInt(theTime%60);
                    if(theTime1 > 60) {
                        theTime2 = parseInt(theTime1/60);
                        theTime1 = parseInt(theTime1%60);
                    }
                }
                var result = ""+parseInt(theTime)+"";
                if(theTime1 > 0) {
                    result = ""+parseInt(theTime1)+":"+result;
                }
                if(theTime2 > 0) {
                    result = ""+parseInt(theTime2)+":"+result;
                }
                return result;
            },

            substr: function(str , size){
                if(!str)return ""
                if(str.length > size){
                    return str.substring(0, size)+"...";
                }
                return str;
            },

            updateItem: function (v, key) {
                console.log(v, key)
            },

            getCount: function (groupValue) {
                var vm = this
                if(vm.groups && vm.groups[groupValue]){
                    return vm.groups[groupValue]
                }else{
                    return ''
                }
            },

            getSelect: function (index) {
                if(!this.itemList){
                    return 0
                }
                var  vm = this
                for(var a = 0; a < vm.selectFields.length; a++){
                    var field = vm.selectFields[a]
                    if( this.itemList[index][field] != 1 ){
                        return 0
                    }
                }
                return 1;
            },

            getSelectAll: function () {
                if(!this.itemList || this.itemList.length == 0){
                    return 0
                }

                for(var i = 0; i < this.itemList.length; i++){
                    if(this.getSelect(i) != 1){
                        return 0
                    }
                }
                return 1 ;
            },

            isSelectRow: function (index) {
                return this.getSelect(index) == 1;
            },

            checkedItem: function (index, k) {
                var item = this.itemList[index]
                console.log(item[k])
                return item[k]==1
            },

            putItem: function (index, k, v) {
                Vue.set(this.itemList[index], k, v)
            },

            getItem: function (index, k) {
               return this.itemList[index][k]
            },

            toggleItem: function (index, k ) {
                // console.log("toggleItem", index, k)
                var _k = this.itemList[index][k]
                if(_k){
                    // Vue.delete(this.itemList[index], k)
                    Vue.set(this.itemList[index], k, 0)
                }else{
                    Vue.set(this.itemList[index], k, 1)
                }
            },

            toggleSelectRow: function () {
                var args = Array.from(arguments);
                var index = args.slice(0, 1)
                // var fields = args.slice(1)

                var select = this.getSelect(index )
                if(select){
                    this.selectRow(index, 0)
                }else{
                    this.selectRow(index, 1)
                }

            },

            selectList: function (v) {
                var vm = this
                for(var i = 0; i < this.itemList.length; i++){
                    for(var a = 0; a < vm.selectFields.length; a++){
                        this.putItem(i, vm.selectFields[a], v);
                    }
                }
            },

            selectRow: function (index,  v) {
                var vm = this
                for(var a = 0; a < vm.selectFields.length; a++){
                    this.putItem(index, vm.selectFields[a], v);
                }
            },

            toggleSelectList: function () {
                if(!this.getSelectAll()){
                    this.selectList(1)
                }else{
                    this.selectList(0)
                }
                this.selectAll = this.getSelectAll()
            },

            saveParams: function () {
                var vm = this
                // console.log("save ", JSON.stringify(vm.params))
                sessionStorage.setItem(paramsKey, JSON.stringify(vm.params))
            },

            loadParams: function () {
                var vm = this
                var load =  false
                var sessionParams = JSON.parse(sessionStorage.getItem(paramsKey))
                // console.log("loadParams", sessionParams)
                if(sessionParams){
                    vm.params = sessionParams;
                    load = true
                }
                return load
            },

            search: function () {
                var vm = this
                vm.loading = true
                vm.itemList = null

                //加载数据数量
                $.getJSON(count_url, vm.params, function (resp) {

                    if(resp.success){

                        //保存查询结果
                        vm.saveParams()

                        vm.total = resp.data

                        $page.paging(vm.total , {
                            lapping: 0,
                            format: '[< nncnnn >]',
                            page: vm.params.page,
                            perpage: vm.params.pageSize,
                            onSelect: function(page) {
                                vm.params.page = page

                                var $as = $("a[data-page="+page+"]", $page)

                                $as.each(function(i){
                                    var $a = $(this);
                                    $a.attr("class", $a.attr("class").replace("_fg", "_bg"))
                                })

                                //加载数据
                                $.ajax({
                                    url:url,
                                    cache:false,
                                    data: vm.params,
                                    success: function (resp) {
                                        //已经加载数据
                                        vm.loading = false

                                        if(resp.success && resp.data){
                                            vm.itemList = resp.data
                                            vm.$nextTick(function () {
                                                // if (typeof (bindEvent) == 'function'){
                                                    // setTimeout(function () {
                                                    //     bindEvent()
                                                    // }, 200)
                                                // }
                                            })
                                        }
                                    }
                                });
                            },
                            onFormat: function(type) {
                                switch (type) {
                                    case 'block': // n and c
                                        return '<a class="num_fg" href="#">' + this.value + '</a>';
                                    case 'next': // >
                                        return '<a class="next_fg" href="#">&gt;</a>';
                                    case 'prev': // <
                                        return '<a class="previous_fg" href="#">&lt;</a>';
                                    case 'first': // [
                                        return '<a class="head_fg" href="#">首页</a>';
                                    case 'last': // ]
                                        return '<a class="tail_fg" href="#">尾页</a>';
                                }
                            }
                        });
                    }
                })

                //读取其他组数据数量
                vm.groups = {}
                if(vm.params['searchKey'] && group && groups){
                    console.log(group, groups )

                    var _params = _.clone(vm.params)
                    _.each(groups.split(","), function(gv){

                        console.log(group, gv)
                        console.log("vm.params ", group, vm.params[group])

                        if(vm.params[group] != gv){
                            _params[group] = gv
                            $.getJSON(count_url, _params, function (resp) {
                                if(resp.success){
                                    vm.groups[gv] = resp.data
                                }
                            })
                        }

                    })
                }
            },

            searchBtn: function ( ) {
                var vm = this
                var $Wdate = $(".Wdate")
                if($Wdate.length == 1){
                    Vue.set(vm.params, 'searchDate', $Wdate.val())
                }

                if($Wdate.length == 2){
                    Vue.set(vm.params, 'searchDate', $Wdate.eq(0).val())
                    Vue.set(vm.params, 'endDate', $Wdate.eq(1).val())
                }

                vm.search()
            },

            search1: function (k, v ) {
                var vm = this
                Vue.set(vm.params, k, v)
                console.log("vm.params=", vm.params)
                vm.search()
            },

            deleteItem: function (id) {
                console.log("delete fun ", id)
                var vm = this
                easyDialog.open({
                    container : {
                        header : '删除警告',
                        content : '您确定删除？',
                        yesFn : function () {
                            $.getJSON(delete_url, {id: id}, function (resp) {
                                if(resp.success) {
                                    vm.search()
                                }
                            });
                        },
                        // noFn : true
                    }
                })
            },

            play: function (url) {
                console.log("play ", url)
                var ts = _.now()
                easyDialog.open({
                    container : {
                        header : 'Play',
                        content : '<video id="'+ts+'" autoplay="autoplay" src="'+url+'" width="100%">',
                    },
                    callback: function(){
                        console.log("destroy", ts)
                        $("#"+ts).attr('src', '')
                    }
                })
            }
        }
    })
})

$(".img_box img").hide().eq(0).show();
var x = 0;
//左右箭头轮播效果
$(".arrow_r").click(function(){
    if(x<2){
        x = x+1;
    }
    else{x = 0}
    $(".img_box img").hide().eq(x).show();
    $(".rounds li").eq(x).addClass("current").siblings().removeClass("current");
})
$(".arrow_l").click(function(){
    if(x>0){
        x = x-11;
    }
    else{x = 2}
    $(".img_box img").hide().eq(x).show();
    $(".rounds li").eq(x).addClass("current").siblings().removeClass("current");
})
//圆圈轮播效果
$(".rounds li").click(function(){
    x= $(this).index()
    $(".rounds li").eq(x).addClass("current").siblings().removeClass("current");
    $(".img_box img").hide().eq(x).show();
})
//定时滚动效果
var t = setInterval(dingshi,3000)
function dingshi(){
    if(x<2){
        x = x+1;
    }
    else{x = 0}
    $(".img_box img").hide().eq(x).show();
    $(".rounds li").eq(x).addClass("current").siblings().removeClass("current");
}
$(".img_box img").mouseenter(
    function () {
        clearInterval(t)
    })

$(".img_box img").mouseleave(
    function () {
        dingshi()
        t = setInterval(dingshi, 3000)
    })
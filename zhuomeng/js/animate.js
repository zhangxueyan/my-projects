var y = 0
$(".img_box img").hide().eq(0).show()
$(".online_message,.hotline_phone,.attention_code").hide()


$(".contact_informaton dd").mouseenter(
    function () {
        y = $(this).index()
        document.title = y
        $(".contact_informaton dd").eq(y).children().show()
        $(".contact_informaton dd").eq(y).toggleClass("changecolor")

    }
).mouseleave(
    function () {
        $(".contact_informaton dd").eq(y).children().hide().first().show()
        $(".contact_informaton dd").eq(y).toggleClass("changecolor")

    }
)


var x = 0

//左右箭头轮播图
$(".arrow_r").click(function () {
        if (x < 2) {
            x = x + 1
        }
        else {
            x = 0
        }
        $(".img_box img").hide().eq(x).show()
        $(".rounds li").eq(x).addClass("current").siblings().removeClass("current")
    }
)

$(".arrow_l").click(function () {
        if (x > 0) {
            x = x - 1
        }
        else {
            x = 2
        }
        $(".img_box img").hide().eq(x).show()
    }
)

//圆圈头轮播图
$(".rounds li").click(function () {
        x = $(this).index()
        $(".img_box img").hide().eq(x).show()
        $(".rounds li").eq(x).addClass("current").siblings().removeClass("current")
    }
)

//经典案例鼠标经过显示

$(".cases_pict li").children("dl,dd").hide()

$(".cases_pict li").mouseenter(
    function () {

        $(this).children().show()
    }
).mouseleave(

    function () {

        $(this).children("dl,dd").hide()
    }

)

<!--定时-->
var t = setInterval(dingshi, 3000)
function dingshi() {
    if (x < 2) {
        x = x + 1
    } else {
        x = 0
    }
    $(".img_box img").hide().eq(x).show()
    $(".rounds li").eq(x).addClass("current").siblings().removeClass("current")
}
<!--停止后播放-->

$(".img_box img").mouseenter(
    function () {
        clearInterval(t)
    }
)

$(".img_box img").mouseleave(
    function () {
        dingshi()
        t = setInterval(dingshi, 3000)
    }
)

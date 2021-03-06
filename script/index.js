//basic info
const PC_MIN_WIDTH = 671;
const ak = 'jg25XKGpUAwxqo0IPxNqYA9GMtzIFpOU';
const documentClient = document.documentElement || document.body;
const mapObj = document.getElementById('allmap');
let markInfoWindow = null;
let clientDivice = 'pc';
var getContent = function (ad, tel, uid) {
    return `<div style="margin:0;line-height:20px;padding:2px;font-size:14px">
        地址：${ad||''}。
        <div>电话: ${tel||''}</div>
        <div>详情:<a href="javascript:;" onclick="showInfo('${uid}')">点击查看</a></div>
        </div>`;
}

if (documentClient.clientWidth < PC_MIN_WIDTH) {
    clientDivice = 'mobile';
}
window.onresize = function () {
    clientDivice = documentClient.clientWidth < PC_MIN_WIDTH ? 'mobile' : clientDivice = 'pc';
}
//百度地图
mapObj.style.height = document.documentElement.clientHeight - (clientDivice === 'mobile' ? 30 : 0) + 'px';

// 百度地图API功能
function G(id) {
    return document.getElementById(id);
}
var map = new BMap.Map("allmap", {
    enableMapClick: false
});
map.enableScrollWheelZoom(); //启用滚轮放大缩小，默认禁用
map.enableContinuousZoom(); //启用地图惯性拖拽，默认禁用

/** 
 * 重构marker
 * params{items}地址列表 
 */
function createMarker(items) {
    map.clearOverlays();
    if (items instanceof Array && items.length > 0) {
        map.centerAndZoom(new BMap.Point(items[0]['location']['lng'], items[0]['location']['lat']), 13);
        for (let i = 0; i < items.length; i++) {
            let point = new BMap.Point(items[i]['location']['lng'], items[i]['location']['lat'])
            let marker = new BMap.Marker(point, {});
            marker.uid = items[i].uid;
            let label = new BMap.Label(i + 1, {
                offset: new BMap.Size(i > 8 ? 1 : 5, 5)
            });
            label.setStyle({
                background: 'none',
                color: '#fff',
                border: 'none'
            });
            marker.setLabel(label);
            marker.addEventListener("click", function (e) {
                marker.setAnimation(4);
                showInfo(marker.uid);
            });
            map.addOverlay(marker);
        }
    }
}
createMarker(myFavorite);


//显示ｍａｒｋｅｒ详情
function showInfo(uid) {
    if (markInfoWindow) {
        markInfoWindow.close();
    }
    fetch(`http://api.map.baidu.com/place/v2/detail?uid=${uid}&output=json&scope=2&ak=${ak}`, {
        method: 'get',
        headers: {
            'Content-Type': 'application/json;charset=UTF-8'
        }
    }).then(function (response) {
        if (response.status >= 200 && response.status < 300) {
            return response.json();
        }
        return false;
    }).then(function (data) {
        let content = '无详细信息';
        if (data) {
            let info = data.result.detail_info;
            let point = new BMap.Point(data.result['location']['lng'], data.result['location']['lat']);
            content =
                `<div style="margin:0;line-height:20px;padding:2px;font-size:14px">
                <div>商户地址：${data.result.address||'暂无'}。</div>
                <div>联系电话: ${data.result.telephone||'暂无'}。</div>
                <div>人均消费:${info.price?info.price+'元/人':'暂无'}。</div>
                <div>营业时间:${info.shop_hours||'暂无'}。</div>
                <div>菜品详情:${info.recommendation||'暂无'}</div>
                </div>`;

            markInfoWindow = new BMapLib.SearchInfoWindow(map, content, {
                title: data.result.name, //标题
                width: 290, //宽度
                height: data ? 300 : 30, //高度
                panel: "panel", //检索结果面板
                enableAutoPan: true, //自动平移
                searchTypes: []
            });
            markInfoWindow.open(point);
        } else {
            alert(content);
        }
    }).catch(function () {
        alert('请求详情信息报错，请检查：1，网络是否正常。2，是否安装的插件（详见READMME.md文件）。');
    });
}

//数据查询和绑定
function viewModel() {
    var that = this;
    this.items = ko.observableArray(myFavorite);
    this.searchValue = ko.observable('');
    this.showMenu = ko.observable(false);
    this.getValue = function (value, elment) {
        that.searchValue(elment.currentTarget.value)
    }
    this.mapFiltered = ko.computed(function () {
        var r = ko.utils.arrayFilter(that.items(), function (item) {
            return item.name.includes(that.searchValue())
        });
        createMarker(r);
        return r;
    });
    this.goSearch = function () {
        map.clearOverlays();
        fetch(
            `http://api.map.baidu.com/place/v2/search?query=${that.searchValue()}&tag=美食&region=成都&output=json&ak=${ak}`, {
                method: 'get',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8'
                }
            }).then(function (response) {
            if (response.status >= 200 && response.status < 300) {
                return response.json();
            }
            return false;
        }).then(function (data) {
            if (data) {
                that.items(data.results);
                createMarker(data.results);
            }
        })
    }
    this.locate = function (item) {
        if (item.location) {
            let point = new BMap.Point(item['location']['lng'], item['location']['lat']);
            map.centerAndZoom(point, 14);
            markInfoWindow = new BMapLib.SearchInfoWindow(map, getContent(item.address, item.telephone, item.uid), {
                title: item.name, //标题
                width: 290, //宽度
                height: 80, //高度
                panel: "panel", //检索结果面板
                enableAutoPan: true, //自动平移
                searchTypes: [
                    // BMAPLIB_TAB_SEARCH, //周边检索
                    // BMAPLIB_TAB_TO_HERE, //到这里去
                    // BMAPLIB_TAB_FROM_HERE //从这里出发
                ]
            });
            markInfoWindow.open(point);
        }
    }
    this.changeList = function () {
        that.showMenu(!that.showMenu());
    }
}
ko.applyBindings(new viewModel());
'use strict';

class Gps {
    
    constructor(targetGpsDataArray) {
        this.isStart = false;
        this.successFunc = null;
        this.errorFunc = null;
        this.targetGpsDataArray = targetGpsDataArray ? targetGpsDataArray : [];
        this.position = null;
        this.errorCode = null;
        this.errorMessage = null;
        this.distanceWithinRange = 0;
        this.watchId = -1;
    }

    start()
    {
        const isSupport = "geolocation" in navigator;
        if (!isSupport)
        {
            return false;
        }

        const opt = {
            "enableHighAccuracy": true,
            "timeout": 10000,
            "maximumAge": 0,
        };
        this.watchId = navigator.geolocation.watchPosition(
            function(pos)
            {
                this._innerSuccessFunction(pos);
            }.bind(this)
            , 
            function(err)
            {
                this._innerErrorFunction(err);
            }.bind(this)
            , opt);
        this.isStart = true;
        return true;
    }

    stop()
    {
        if (!this.isStart)
        {
            return;
        }
        navigator.geolocation.clearWatch(this.watchId);
        this.isStart = false;
        this.watchId = -1;
    }

    _innerSuccessFunction(pos) {
        this.position = pos;
        this._distance(pos);
        if (this.successFunc)
        {
            this.successFunc(this);
        }
    }

    _innerErrorFunction(err) {
        this.errorCode = err.code;
        switch(err.code){
            case 1 : 
                this.errorMessage = "位置情報の利用が許可されていません";
                break; 
            case 2 : 
                this.errorMessage = "デバイスの位置が判定できません";
                break;
            case 3 : 
                this.errorMessage = "タイムアウトしました";
                break;
            default : 
                errorMessage = err.message;
        }
        if (this.errorFunc)
        {
            this.errorFunc(this);
        }
    }

    _distance(pos)
    {
        // 測地系定数
        
        // GRS80 ( 世界測地系 ) <- 現在の日本での標準
        //const RX = 6378137.000000  // 赤道半径
        //const RY = 6356752.314140  // 極半径
        // ベッセル楕円体 ( 旧日本測地系 ) <- 以前の日本での標準
        //const RX = 6377397.155000  // 赤道半径
        //const RY = 6356079.000000  // 極半径
        // WGS84 ( GPS ) <- Google はこの測地系
        const RX = 6378137.000000  // 赤道半径
        const RY = 6356752.314245  // 極半径

        const R = Math.PI / 180;
        const currentLat = pos.coords.latitude;
	    const currentLng = pos.coords.longitude;
        const length = this.targetGpsDataArray.length;
        let i = 0;
        let data = null;
        let range = this.distanceWithinRange;
        for (;i < length; i++)
        {
            data = this.targetGpsDataArray[i];
            range = data.distanceWithinRange !== -1 ? data.distanceWithinRange : range;
            
            // 2点の経度の差を計算 ( ラジアン )
            var a_x = data.lng * Math.PI / 180 - currentLng * R;
          
            // 2点の緯度の差を計算 ( ラジアン )
            var a_y = data.lat * Math.PI / 180 - currentLat * R;
          
            // 2点の緯度の平均を計算
            var p = (data.lat * Math.PI / 180 + currentLat * R) / 2;
          
            // 離心率を計算
            var e = Math.sqrt((RX * RX - RY * RY) / (RX * RX));
          
            // 子午線・卯酉線曲率半径の分母Wを計算
            var w = Math.sqrt(1 - e * e * Math.sin(p) * Math.sin(p));
          
            // 子午線曲率半径を計算
            var m = RX * (1 - e * e) / (w * w * w);
          
            // 卯酉線曲率半径を計算
            var n = RX / w;
          
            // 距離を計算
            var d  = Math.pow(a_y * m, 2) + Math.pow(a_x * n * Math.cos(p), 2);
            d = Math.round(Math.sqrt(d));

            data.dtg = d;
            data.withinRange = d <= range;          
        }
    }   
}

class GpsData
{
    constructor(name, lat, lng) {
        this.name = name,
        this.lat = lat;
        this.lng = lng;
        this.dtg = -1;
        this.withinRange = false;
        this.distanceWithinRange = -1;
    }
}
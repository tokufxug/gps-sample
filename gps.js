'use strict';

class Gps {
    
    static ERROR_CODE_ALLOWED_LOCATION = 1;
    static ERROR_CODE_NOT_DETERMINED_LOCATION = 2;
    static ERROR_CODE_TIMEOUT = 3;

    static LANGUAGE_JAPANESE = 'JAPANESE';
    static LANGUAGE_ENGLISH = 'ENGLISH';

    static ERROR_MSG_ALLOWED_LOCATION_JAPANESE = '位置情報の利用が許可されていません';
    static ERROR_MSG_NOT_DETERMINED_LOCATION_JAPANESE = 'デバイスの位置が判定できません';
    static ERROR_MSG_TIMEOUT_JAPANESE = 'タイムアウトしました';

    static ERROR_MSG_ALLOWED_LOCATION_ENGLISH = 'You are not allowed to use location information.';
    static ERROR_MSG_NOT_DETERMINED_LOCATION_ENGLISH = 'Unable to determine the location of the device.';
    static ERROR_MSG_TIMEOUT_ENGLISH = 'Timeout, sir.';
    
    constructor(targetGpsDataArray, language) {
        this.language = language ? language : Gps.LANGUAGE_JAPANESE;
        this.isStart = false;
        this.successFunc = null;
        this.errorFunc = null;
        this.targetGpsDataArray = targetGpsDataArray ? targetGpsDataArray : [];
        this.position = null;
        this.errorCode = null;
        this.errorMessage = null;
        this.distanceWithinRange = 0;
        this.watchId = -1;
        this.geodeticSystem = 'WGS84';
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
            case Gps.ERROR_CODE_ALLOWED_LOCATION:
                this.errorMessage = 
                    this.language === Gps.LANGUAGE_ENGLISH ? Gps.ERROR_MSG_ALLOWED_LOCATION_ENGLISH : Gps.ERROR_MSG_ALLOWED_LOCATION_JAPANESE;
                break; 
            case Gps.ERROR_CODE_NOT_DETERMINED_LOCATION: 
                this.errorMessage = 
                    this.language === Gps.LANGUAGE_ENGLISH ? Gps.ERROR_MSG_NOT_DETERMINED_LOCATION_ENGLISH : Gps.ERROR_MSG_NOT_DETERMINED_LOCATION_JAPANESE;
                break;
            case Gps.ERROR_CODE_TIMEOUT: 
                this.errorMessage = 
                    this.language === Gps.LANGUAGE_ENGLISH ? Gps.ERROR_MSG_TIMEOUT_ENGLISH : Gps.ERROR_MSG_TIMEOUT_JAPANESE;
                break;
            default : 
                this.errorMessage = err.message;
        }
        if (this.errorFunc)
        {
            this.errorFunc(this);
        }
    }

    _distance(pos)
    {
        // 測地系定数
        
        // ベッセル楕円体 ( 旧日本測地系 ) <- 以前の日本での標準
        //const RX = 6377397.155000  // 赤道半径
        //const RY = 6356079.000000  // 極半径
        
        // WGS84 ( GPS ) <- Google はこの測地系
        let RX = 6378137.000000  // 赤道半径
        let RY = 6356752.314245  // 極半径

        const R = Math.PI / 180;
        const currentLat = pos.coords.latitude;
	    const currentLng = pos.coords.longitude;
        const length = this.targetGpsDataArray.length;
        let i = 0;
        let data = null;
        let range = this.distanceWithinRange;

        // GRS80 ( 世界測地系 ) <- 現在の日本での標準
        if (this.geodeticSystem === 'GRS80')
        {
             RX = 6378137.000000  // 赤道半径
             RY = 6356752.314140  // 極半径
        }
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
const fs = require('fs');
const  jsdom = require('jsdom');
const  CryptoJS = require('crypto-js');
const querystring = require('querystring');
const common = require('./Rebels_jdCommon');

class H5st {
	constructor() {
		this.domWindow3_1 = null;
		this.domWindow3_1_UA = null;
		this.domWindow4_1 = null;
		this.domWindow4_1_UA = null;
		this.domWindow4_2 = null;
		this.domWindow4_2_UA = null;
		this.domWindow4_3 = null;
		this.domWindow4_3_UA = null;
		this.domWindow4_4 = null;
		this.domWindow4_4_UA = null;
		this._latestAppVersionData = {
			'build': '169159',
			'version':'12.4.3'
		};
		this._latestIOSVersion = '17.4';
	}

	// 定义一个异步函数_sleep，用于创建一个延迟指定时间后解析的 Promise
	async _sleep (time) {
		return new Promise((resolve, reject) =>{
			setTimeout(()=>{
				resolve(time);
			},time)
		});
	}

	// 引入所需模块
	async _loadH5Sdk (version, ua) {
		const { JSDOM } = jsdom;

		// 创建资源加载器和虚拟控制台
    	const resources = new jsdom.ResourceLoader({ 'userAgent': ua });
    	const virtualConsole = new jsdom.VirtualConsole();

		// JSDOM 配置项
		const jsdomOptions = {
			'url': 'http://localhost',
			'userAgent': ua,
			'runScripts': 'dangerously',
			'resources': resources,
			'includeNodeLocations': true,
			'storageQuota': 1000000000,
			'pretendToBeVisual': true,
			'virtualConsole': virtualConsole
		};

		let s = ''; // 初始化脚本字符串
		// 根据版本选择要加载的脚本文件
		switch (version) {
			case '3.1':
				s = '<script>' + fs.readFileSync(__dirname + "/Rebels/3_1.js", "utf-8") + '</script>';
				break;
			case '4.1':
				s = '<script>' + fs.readFileSync(__dirname + "/Rebels/4_1.js", "utf-8") + '</script>';
				break;
			case '4.2':
				s = '<script>' + fs.readFileSync(__dirname + "/Rebels/4_2.js", "utf-8") + '</script>';
				break;
			case '4.3':
				s = '<script>' + fs.readFileSync(__dirname + "/Rebels/4_3.js", "utf-8") + '</script>';
				break;
			case '4.4':
				s = '<script>' + fs.readFileSync(__dirname + "/Rebels/4.js", "utf-8") + '</script>';
				break;
		}

		// 创建 JSDOM 实例
		const jsdomInstance = new JSDOM("<body>\n    " + s + "\n</body>", jsdomOptions);

		// 等待加载完毕
		do {
			await this._sleep(100); // 延迟等待
		} while (!jsdomInstance.window.ParamsSign);
		
		// 根据版本保存对应的 window 实例
		switch (version) {
		case '3.1':
			this.domWindow3_1 = jsdomInstance.window;
			break;
		case '4.1' : 
			this.domWindow4_1 = jsdomInstance.window;
			break;
		case '4.2': 
			this.domWindow4_2 = jsdomInstance.window;
			break;
		case '4.3' : 
			this.domWindow4_3 = jsdomInstance.window;
			break;
		case '4.4': 
			this.domWindow4_4 = jsdomInstance.window;
			break;
		}
	}
	
	// 用于生成签名
	async _signWaap(appId, requestData, WindowClass) {

		// 创建 ParamsSign 实例
		const windowInstance = new WindowClass.ParamsSign({
			'appId': appId,
			'preRequest': false,
			'debug': false,
			// 定义签名成功、远程请求 Token 失败和请求 Token 失败时的回调函数
			'onSign'({ code, message, data }) { },
			'onRequestTokenRemotely'({ code, message }) { },
			'onRequestToken'({ code, message }) { }
		});

		// 构造签名所需的参数对象
		let signParams = {
			'appid': requestData.appid,
			'body': this._SHA256(JSON.stringify(requestData.body)).toString(), // 对 body 进行 SHA256 加密
			'client': requestData.client || '',
			'clientVersion': requestData.clientVersion || '',
			'functionId': requestData.functionId
		};


		// 删除 requestData 对象中 client 和 clientVersion 属性的空值或假值
		for (const property of ['client', 'clientVersion']) {
			!requestData[property] && delete signParams[property];
		}

		// 如果 requestData 对象中存在属性 t，则将其赋值给 signParams 对象的属性 t
		requestData?.t && (signParams.t = requestData.t);

		// 调用 ParamsSign 实例的 sign 方法生成签名
		let signatureResult = await windowInstance.sign(signParams);

		// 如果签名未生成或为 null，则输出错误信息并将 h5st 置为空字符串
		if (!signatureResult.h5st || signatureResult.h5st == null) {
			console.log('❌ getH5st 签名生成失败');
			signatureResult.h5st = '';
		}

		// 返回签名 h5st，如果不存在则返回空字符串
		return signatureResult?.h5st || '';
	}

	/**
	 * 获取 H5st 值
	 * @param {object} params 参数对象
	 * @returns {object} 包含 H5st 值的对象
	 */
	async getH5st (params) {
		try {
			if(params === null || typeof params != 'object'){
				console.log('❌ getH5st 传入参数有误');
				return null;
			}else {
				const requiredFields  = ['appId','appid','body','functionId'];
				const missingFields = requiredFields.filter(field => !(field in params && params[field] !== undefined));

				if (missingFields.length > 0) {
					console.log('❌ getH5st 传入参数有误，缺少必要参数：' + missingFields.join(", "));
					return null;
				}

			}
	
			if (!['3.1', '4.1', '4.2', '4.3', '4.4'].includes(params?.version)) {
				params.version = '4.3'; // Set params.version to 4.3 if it's not one of the specified versions
			}

			const {
				appId,
				appid,
				body,
				client,
				clientVersion,
				functionId,
				version
			} = params;

			const ua = params ?.['ua'] || this._genUA();
			const domWindow = 'domWindow' + version.replace('.', '_');
			const domWindowUA = domWindow + '_UA'; 
			// 如果 domWindow 不存在或者 domWindowUA 存在且不等于当前用户代理 (ua)
			if (!this[domWindow] || (this[domWindowUA] && this[domWindowUA] !== ua)) {
				// 调用异步函数 _loadH5Sdk 加载 H5 SDK，并传递版本号和当前用户代理
				// 并将加载的用户代理保存到 domWindowUA 中
				await this._loadH5Sdk(version, ua);
				this[domWindowUA] = ua;
			}
			const requestData = {
				'appid': appid,
				'body': body,
				'client': client,
				'clientVersion': clientVersion,
				'functionId': functionId
			};
			if(params.t && typeof params.t === 'boolean'){
				params.t = Date.now();
				requestData.t = params.t;
			}else{
				params.t = '';
			}

			if(!requestData.client){
				delete requestData.client;
			}
			if(!requestData.clientVersion){
				delete requestData.clientVersion;
			}

			const generatedH5st = await this._signWaap(appId, requestData, this[domWindow]);
			const updatedRequestData = {
				'functionId': functionId,
				'body': JSON.stringify(body),
				't': '',
				'appid': appid,
				'client': '',
				'clientVersion': '',
				'h5st': generatedH5st || ''
			};
			 // 根据参数中的字段更新 updatedRequestData 对象
			 for (const paramKey of ['t', 'client', 'clientVersion']) {
				params[paramKey] ? updatedRequestData[paramKey] = params[paramKey] : delete updatedRequestData[paramKey];
			}
			const result = Object['assign']({},{params}, {
				'h5st': generatedH5st || '',
				'params': querystring.stringify(updatedRequestData),
				'paramsData': updatedRequestData
			});
			return result;
		} catch(err) {
			console.log("❌ getH5st 遇到了错误 "+ (err.message || err));
		}
		return null;
	} 
	
	/**
	 * 生成用户代理的异步函数
	 * @returns {string} - 生成的用户代理字符串
	 */
	async _genUA() {

		// 调用 generateRandomString 函数生成随机字符串
		const rn = common.genUuid();
		// 构造用户代理信息
		const uaArr = [
			"jdapp",
			"iPhone",
			this._latestAppVersionData.version,
			"",
			"rn/" + rn,
			"M/5.0",
			"appBuild/" + this._latestAppVersionData.build,
			"jdSupportDarkMode/0",
			"ef/1",
			// 替换参数为当前时间戳
			"ep/%7B%22ciphertype%22%3A5%2C%22cipher%22%3A%7B%22ud%22%3A%22DG%3D%3D%22%2C%22sv%22%3A%22CG%3D%3D%22%2C%22iad%22%3A%22%22%7D%2C%22ts%22%3A" + Math.floor(Date.now() / 1000) + "%2C%22hdid%22%3A%22JM9F1ywUPwflvMIpYPok0tt5k9kW4ArJEU3lfLhxBqw%3D%22%2C%22version%22%3A%221.0.3%22%2C%22appname%22%3A%22com.360buy.jdmobile%22%2C%22ridx%22%3A-1%7D",
			// 替换参数为最新 iOS 版本
			"Mozilla/5.0 (iPhone; CPU iPhone OS " + this._latestIOSVersion.replace('.', '_') + " like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
			"supportJDSHWK/1",
			"",
		];
		// 将用户代理信息数组转换为字符串形式
		const ua = uaArr.join(';');
	
		return ua;
	} 

	/**
	 *
	 * Secure Hash Algorithm (SHA256)
	 * http://www.webtoolkit.info/
	 *
	 * Original code by Angel Marin, Paul Johnston.
	 *
	 **/
	_SHA256(s) {
		var chrsz = 8;
		var hexcase = 0;
		function safe_add (x, y) {
			var lsw = (x & 0xFFFF) + (y & 0xFFFF);
			var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
			return (msw << 16) | (lsw & 0xFFFF);
		}
		function S (X, n) { return ( X >>> n ) | (X << (32 - n)); }
		function R (X, n) { return ( X >>> n ); }
		function Ch(x, y, z) { return ((x & y) ^ ((~x) & z)); }
		function Maj(x, y, z) { return ((x & y) ^ (x & z) ^ (y & z)); }
		function Sigma0256(x) { return (S(x, 2) ^ S(x, 13) ^ S(x, 22)); }
		function Sigma1256(x) { return (S(x, 6) ^ S(x, 11) ^ S(x, 25)); }
		function Gamma0256(x) { return (S(x, 7) ^ S(x, 18) ^ R(x, 3)); }
		function Gamma1256(x) { return (S(x, 17) ^ S(x, 19) ^ R(x, 10)); }
		function core_sha256 (m, l) {
			var K = new Array(0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3, 0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0xFC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA, 0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x6CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13, 0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070, 0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208, 0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2);
			var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
			var W = new Array(64);
			var a, b, c, d, e, f, g, h, i, j;
			var T1, T2;
			m[l >> 5] |= 0x80 << (24 - l % 32);
			m[((l + 64 >> 9) << 4) + 15] = l;
			for ( var i = 0; i<m.length; i+=16 ) {
				a = HASH[0];
				b = HASH[1];
				c = HASH[2];
				d = HASH[3];
				e = HASH[4];
				f = HASH[5];
				g = HASH[6];
				h = HASH[7];
				for ( var j = 0; j<64; j++) {
					if (j < 16) W[j] = m[j + i];
					else W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
					T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
					T2 = safe_add(Sigma0256(a), Maj(a, b, c));
					h = g;
					g = f;
					f = e;
					e = safe_add(d, T1);
					d = c;
					c = b;
					b = a;
					a = safe_add(T1, T2);
				}
				HASH[0] = safe_add(a, HASH[0]);
				HASH[1] = safe_add(b, HASH[1]);
				HASH[2] = safe_add(c, HASH[2]);
				HASH[3] = safe_add(d, HASH[3]);
				HASH[4] = safe_add(e, HASH[4]);
				HASH[5] = safe_add(f, HASH[5]);
				HASH[6] = safe_add(g, HASH[6]);
				HASH[7] = safe_add(h, HASH[7]);
			}
			return HASH;
		}
		function str2binb (str) {
			var bin = Array();
			var mask = (1 << chrsz) - 1;
			for(var i = 0; i < str.length * chrsz; i += chrsz) {
				bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);
			}
			return bin;
		}
		function Utf8Encode(string) {
			string = string.replace(/\r\n/g,"\n");
			var utftext = "";
			for (var n = 0; n < string.length; n++) {
				var c = string.charCodeAt(n);
				if (c < 128) {
					utftext += String.fromCharCode(c);
				}
				else if((c > 127) && (c < 2048)) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				}
				else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}
			}
			return utftext;
		}
		function binb2hex (binarray) {
			var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
			var str = "";
			for(var i = 0; i < binarray.length * 4; i++) {
				str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
					hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8 )) & 0xF);
			}
			return str;
		}
		s = Utf8Encode(s);
		return binb2hex(core_sha256(str2binb(s), s.length * chrsz));
	}
}

module.exports = {
	'H5st': new H5st()
};
/*
一个强大的推送通知库，主要用于汇总多条账号消息后集中推送通知
默认情况下账号消息指的是单一账号的消息，它由“<前缀><用户名><消息内容>”组成，其中消息内容由一条或多条组成最后用指定字符拼接成一条合并内容
脚本最终汇总多条账号消息后集中触发推送通知业务，每个账号的消息占用一行，排列顺序以优先触发记录为原则
此库封装了多条方法，推送通知业务调用自 sendNotify.js，可引用此模块来平替引用它，支持单消息推送

账号消息自定义功能如下（环境变量）
1。关键词过滤，触发时不推送对应单条账号消息 JD_NOTIFY_FILTER_KEYWORDS
  例：export JD_NOTIFY_FILTER_KEYWORDS="空气@会员"，多个关键词用@分割
2。关键词清除，触发时会清除消息内容中的对应关键字 JD_NOTIFY_CLEAR_KEYWORDS
  例：export JD_NOTIFY_CLEAR_KEYWORDS="" # 例："空气"，多个关键词用|分割，如果你不想在账号消息中看到某些字样则可以使用此功能
3。消息内容分隔符 JD_NOTIFY_SEPARATOR，默认为中文逗号
  例：export JD_NOTIFY_SEPARATOR="、"，此分隔符用于分隔多条账号消息
4。设置用户名昵称 JD_NOTIFY_NICKNAMES
  例：export JD_NOTIFY_NICKNAMES="userpin_α@哥哥,userpin_β@弟弟"，多个昵称配置用英文逗号分割，用户名和昵称用@分割
5。是否展示用户名 JD_NOTIFY_SHOW_USERNAME（true/false），默认展示
  例：export JD_NOTIFY_SHOW_USERNAME="false"
6. 设置推送通知的用户名是否脱敏 JD_NOTIFY_USERNAME_MASKING（true/false），默认不脱敏，根据用户名长度动态将部分字符用*替换
  例：JD_NOTIFY_USERNAME_MASKING="true"
7。设置消息前缀格式 JD_NOTIFY_PREFIX_FORMAT，默认为 "【京东账号<序号>】<用户名>："
  例：export JD_NOTIFY_PREFIX_FORMAT="账号%【@】"，%代表账号序号、@代表用户名
8。设置自动合并消息中用数字开头表示数量的内容 JD_NOTIFY_AUTO_MERGE_TYPE
  例：export JD_NOTIFY_AUTO_MERGE_TYPE="积分"，多个规则用@分割，正则匹配

new Env('Rebels_sendJDNotify');
*/
class Notification {
	constructor() {
		this.title = '';
		this.content = '';
		this._messageSeparator = '';
		this.sendNotify = require('../sendNotify').sendNotify;
		this._userNameMasking = false;
		this._showUserName = true;
		this._autoMergeType = '';
		this._initConfig();
		this._messageFilterKeywords = [];
		this._messageClearKeywords = [];
		this._prefixFormat = "【京东账号%】@：";
		this._nicknames = {};
		this._accountsArray = [];

		//
		this._mergeMessages("aaa");
	}

	_initConfig() {
		process.env.JD_NOTIFY_FILTER_KEYWORDS && (this._messageFilterKeywords = process.env.JD_NOTIFY_FILTER_KEYWORDS.split('@').map(II111 => II111.trim()).filter(Boolean));
		process.env.JD_NOTIFY_CLEAR_KEYWORDS && (this_messageClearKeywords = process.env.JD_NOTIFY_CLEAR_KEYWORDS.split('|').filter(Boolean));
		this._messageSeparator = process.env.JD_NOTIFY_SEPARATOR || process.env.JD_NOTIFY_DELIMITER || '，';
		if (process.env.JD_NOTIFY_NICKNAMES) {
			const nickNames = process.env.JD_NOTIFY_NICKNAMES.split(',');
			nickNames.forEach(nickName => {
				let nickArr = nickName.split('@');
				nickArr.length === 2 && nickArr[0] && nickArr[1] && (this._nicknames[nickArr[0]] = nickArr[1]);
			});
		}
		this._showUserName = !(process.env.JD_NOTIFY_SHOW_USERNAME === 'false');
		this._userNameMasking = process.env.JD_NOTIFY_USERNAME_MASKING || process.env.JD_NOTIFY_USERNAME_DESENSITIZATION === 'true';
		process.env.JD_NOTIFY_PREFIX_FORMAT && (this._prefixFormat = process.env.JD_NOTIFY_PREFIX_FORMAT || process.env.JD_NOTIFY_PREFIX_FORMATA);
		process.env.JD_NOTIFY_AUTO_MERGE_TYPE && (this._autoMergeType = process.env.JD_NOTIFY_AUTO_MERGE_TYPE);
	}

	config({
		title,
		content,
		messageSeparator
	}) {

		title !== undefined && (this.title = title);
		content !== undefined && (this.content = content);
		messageSeparator !== undefined && (this.messageSeparator = messageSeparator);
	}

	setTitle(title) {
		this.title = title;
	}

	unsetTitle() {
		this.title = '';
	}

	getTitle() {
		return this.title;
	}

	setContent(content) {
		this.content = content;
	}

	appendContent(content) {
		this.content += content;
	}

	clearContent() {
		this.content = '';
	}

	getContent() {
		return this.content;
	}

	updateContent(content) {
		this.content = content;
	}

	create(index, username) {
		const filterKeywords = this._messageFilterKeywords;
		const clearKeywords = this._messageClearKeywords;
		const prefixFormat = this._prefixFormat;
		const nicknames = this._nicknames;
		(index === undefined) && (index = '');
		const account = {
			'index': '' + index,
			'userName': username,
			'fixed': false,
			'messages': [],
			'originMessages': [],
			'insert'(message) {
				if (!message) return;
				if (account.fixed) return;
				account.originMessages.push(message.trim());
				if ((filterKeywords.length > 0) && filterKeywords.some(IiillI => message.includes(IiillI))) return;
				if (clearKeywords.length > 0) {
					clearKeywords.forEach(IllIl1 => {
						message = message.replace(new RegExp(IllIl1, 'g'), '');
					});
				}
				account.messages.push(message.trim());
			},
			'fix'(message) {
				if (!message) return;
				account.fixed = true;
				account.originMessages = [message.trim()];
				if ((filterKeywords.length> 0) && filterKeywords.some(keyword => message.includes(keyword))) return;
				clearKeywords.length > 0 && clearKeywords.forEach(keyword => {
					message = message.replace(new RegExp(keyword, 'g'), '');
				});
				account.messages = [message.trim()];
			},
			'updateIndex'(index) {
				account.index = '' + index;
			},
			'updateUsername'(userName) {
				account.userName = userName;
			},
			'getInlineContent'() {
				let content = this.originMessages.join(this._messageSeparator).trim();
				this._autoMergeType && ( content = this._mergeMessages(content, this._autoMergeType));
				const username = decodeURIComponent(nicknames[this.userName] || this.userName);
				const prefix = prefixFormat.replace(/%/g, this.index).replace(/@/g, username);
				return '' + prefix + (content || '无');
			}
		};
		this._accountsArray.push(account);
		return account;
	}

	dispose(account) {
		this._accountsArray = this._accountsArray['filter'](item => item !== account);
	}

	disposeByUsername(userName) {
		const result = this._accountsArray.find(ili11i => decodeURIComponent(ili11i.userName) === decodeURIComponent(userName));
		result && this.dispose(result);
	}

	disposeByIndex(index) {
		const result = this._accountsArray.find(account => account.index === '' + index);
		result && this.dispose(result);
	}

	disposeAllMessage() {
		this._accountsArray = [];
	}

	getMessage(maskUserName = false) {
		if (this._accountsArray.length === 0) return '';
		this._formatAcountsMessage();
		if ((this._accountsArray.length === 0)) return '';
		let formattedMessages = [];
		const userNameMasking = this._userNameMasking;
		const showUserName = this._showUserName;
		const prefixFormat = this._prefixFormat;
		for (const {userName,index,messages} of this._accountsArray) {
			let formattedUserName = '';
			if (showUserName) {
				const decodedUserName = decodeURIComponent(this._nicknames[userName] || userName);
				userNameMasking && maskUserName ? formattedUserName = this._desensitizingUserName(decodedUserName) : formattedUserName = decodedUserName;
				
			}
			const formattedPrefix = prefixFormat.replace(/%/g, index).replace(/@/g, formattedUserName);
			const formattedMessagesText = messages.join(this._messageSeparator).trim();
			formattedMessages.push('' + formattedPrefix + formattedMessagesText);
			
		}
		return formattedMessages.join('\n').trim();
	}

	reset() {
		this.unsetTitle();
		this.clearContent();
		this.disposeAllMessage();
	}


	async send(title, content) {
		await this.sendNotify(title, content);
	}

	async sendNotify(title, content) {
		await this.send(title, content);
	}

	async push() {
		let content = this.content.trim();
		const userinfo = this.getMessage(true);
		if (userinfo) content = userinfo.trim() + '\n\n' + content;
		await this.send(this.title, content);
	}

	_mergeMessages(accounts, IllIli) {
		try {
			function parseAccount(account) {
				const parts = account.match(/(\d+)(.+)/);
				return parts ? {
					'count': parseInt(parts[1]),
					'name': parts[2].trim()
				} : {
					'count': null,
					'name': account
				};
			}
			function shouldMergeAccounts(name, count, shouldMerge) {
				return count !== null && shouldMerge.split('@').includes(name);
			}
			for (let i = 0; i < accounts.length; i++) {
					const {count,name} = parseAccount(accounts[i]);
					if ((shouldMergeAccounts(name, count, IllIli))) {
						for (let j = i + 1; j < accounts.length; j++) {
							const {
								count: count2,
								name: name2
							} = parseAccount(accounts[j]);
							if(name === name2){
								accounts[i] = '' + (count + count2) + name;
								accounts.splice(j, 1);
								j--;
							}
						}
					}
				
			}
			return accounts;
		} catch {
			return accounts;
		}
	}

	/**
	 * 用户名脱敏
	 * @param {*} userName 
	 * @returns 
	 */
	_desensitizingUserName(userName) {
		let result = '';
		if ((userName.length < 5)) {
			switch (userName.length) {
				case 1:
					result = userName;
					break;
				case 2:
					result = userName.slice(0, 1) + '*';
					break;
				case 3:
					result = userName.slice(0, 1)+ '*' + userName.slice(-1);
					break;
				case 4:
					result = userName.slice(0, 2)+ '**';
					break;
			}
		} else {
			result = userName.slice(0, 2) + '*'.repeat(userName.length-4) + userName.slice(-2);
		}
		return result;
	}

	_formatAcountsMessage() {
		let accountsArray = [];
		for (let {userName,index,messages} of this._accountsArray) {
			messages = messages.filter(message => message !== null && message !== undefined && message !== '');
			const account = accountsArray.find(i1lIll => i1lIll.userName === userName);
			if(account){
				account.index === '' && (account.index = index);
				(messages.length > 0) && account.messages.push(...messages);
			}else{
				accountsArray.push({
				'userName': userName,
				'index': index,
				'messages': messages
				})
			}
		}
		accountsArray = accountsArray.filter(liIlil => liIlil.messages.length > 0);
		if (this._autoMergeType) {
			accountsArray.forEach(llii1i => {
				llii1i.messages = this._mergeMessages(llii1i.messages, this._autoMergeType);
			});
		}
		this._accountsArray = accountsArray;
	}
}
module.exports= new Notification();
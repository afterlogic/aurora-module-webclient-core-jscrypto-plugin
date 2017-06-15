'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	ko = require('knockout'),
	
	TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),
	
	ModulesManager = require('%PathToCoreWebclientModule%/js/ModulesManager.js'),
	Screens = require('%PathToCoreWebclientModule%/js/Screens.js'),
	
	CAbstractSettingsFormView = ModulesManager.run('SettingsWebclient', 'getAbstractSettingsFormViewClass'),
	
	Popups = require('%PathToCoreWebclientModule%/js/Popups.js'),
	ConfirmPopup = require('%PathToCoreWebclientModule%/js/popups/ConfirmPopup.js'),
	
	JscryptoKey = require('modules/%ModuleName%/js/JscryptoKey.js'),
	Settings = require('modules/%ModuleName%/js/Settings.js'),
	ImportKeyStringPopup = require('modules/%ModuleName%/js/popups/ImportKeyStringPopup.js'),
	GenerateKeyPopup = require('modules/%ModuleName%/js/popups/GenerateKeyPopup.js'),
	ExportInformationPopup = require('modules/%ModuleName%/js/popups/ExportInformationPopup.js'),
	HexUtils = require('modules/%ModuleName%/js/utils/Hex.js')
;

/**
 * @constructor
 */
function CJscryptoSettingsPaneView()
{
	CAbstractSettingsFormView.call(this, Settings.ServerModuleName);
	
	this.EnableJscrypto = ko.observable(Settings.EnableJscrypto());
	
	this.key = ko.observable(JscryptoKey.getKey());
	this.keyName = ko.observable(JscryptoKey.getKeyName());
	
	this.downloadLinkHref = ko.observable('#');

	this.setExportUrl();
	JscryptoKey.getKeyObservable().subscribe(function () {
		this.key(JscryptoKey.getKey());
		this.keyName(JscryptoKey.getKeyName())
		this.setExportUrl();
	}, this);
	this.bIsHttpsEnable = window.location.protocol === "https:";
	this.EncryptionMode = ko.observable(Settings.EncryptionMode());
	this.isImporting = ko.observable(false);
}

_.extendOwn(CJscryptoSettingsPaneView.prototype, CAbstractSettingsFormView.prototype);

CJscryptoSettingsPaneView.prototype.ViewTemplate = '%ModuleName%_JscryptoSettingsPaneView';

CJscryptoSettingsPaneView.prototype.setExportUrl =	function (bShowDialog)
{
	var
		sHref = '#',
		oBlob = null
	;

	this.downloadLinkHref(sHref);
	if (Blob && window.URL && $.isFunction(window.URL.createObjectURL))
	{
		if (JscryptoKey.getKey())
		{
			JscryptoKey.exportKey()
				.then(_.bind(function(keydata) {
					oBlob = new Blob([HexUtils.Array2HexString(new Uint8Array(keydata))], {type: 'text/plain'});
					sHref = window.URL.createObjectURL(oBlob);
					this.downloadLinkHref(sHref);
					if (bShowDialog)
					{
						Popups.showPopup(ExportInformationPopup, [sHref, this.keyName()])
					}
				}, this));
		}
	}

};

CJscryptoSettingsPaneView.prototype.importFileKey = function ()
{
	$("#import-key-file").click();
};

CJscryptoSettingsPaneView.prototype.importStringKey = function ()
{
	Popups.showPopup(ImportKeyStringPopup, [false]);
};

CJscryptoSettingsPaneView.prototype.readKeyFromFile = function ()
{
	var 
		input = document.getElementById('import-key-file'),
		file = input.files[0],
		reader = new FileReader(),
		sContents = '',
		aFileNameParts = input.files[0].name.split('.'),
		sKeyName = ''
	;
	aFileNameParts.splice(aFileNameParts.length - 1, 1);
	sKeyName = aFileNameParts.join('');
	if (!file)
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_IMPORT_KEY'));
		return;
	}
	this.isImporting(true);
	reader.onload =_.bind( function(e) {
		sContents = e.target.result;
		JscryptoKey.importKeyFromString(sKeyName, sContents);
		this.isImporting(false);
	}, this);
	try
	{
		reader.readAsText(file);
	}
	catch (e)
	{
		Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_IMPORT_KEY'));
	}
};

CJscryptoSettingsPaneView.prototype.generateNewKey = function ()
{
	Popups.showPopup(GenerateKeyPopup, [_.bind(CJscryptoSettingsPaneView.prototype.setExportUrl, this)]);
};

/**
 * @param {Object} oKey
 */
CJscryptoSettingsPaneView.prototype.removeJscryptoKey = function ()
{
	var
		sConfirm = '',
		fRemove = _.bind(function (bRemove) {
			if (bRemove)
			{
				var oRes = JscryptoKey.deleteKey();
				if (oRes.error)
				{
					Screens.showError(TextUtils.i18n('%MODULENAME%/ERROR_DELETE_KEY'));
				}
			}
		}, this)
	;
	
	sConfirm = TextUtils.i18n('%MODULENAME%/CONFIRM_DELETE_KEY');
	Popups.showPopup(ConfirmPopup, [sConfirm, fRemove]);
};

CJscryptoSettingsPaneView.prototype.getCurrentValues = function ()
{
	return [
		this.EnableJscrypto(),
		this.EncryptionMode()
	];
};

CJscryptoSettingsPaneView.prototype.revertGlobalValues = function ()
{
	this.EnableJscrypto(Settings.EnableJscrypto());
	this.EncryptionMode(Settings.EncryptionMode());
};

CJscryptoSettingsPaneView.prototype.getParametersForSave = function ()
{
	return {
		'EnableModule': this.EnableJscrypto(),
		'EncryptionMode': Types.pInt(this.EncryptionMode())
	};
};

CJscryptoSettingsPaneView.prototype.applySavedValues = function ()
{
	Settings.update(this.EnableJscrypto(), this.EncryptionMode());
};

module.exports = new CJscryptoSettingsPaneView();

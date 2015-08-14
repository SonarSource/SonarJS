window.ModelWithLanguageMixin = {

  getLanguageCode: function(){
    return this.get('document_language') || 'eng';
  },

  getLanguageName: function(){
    return dc.language.NAMES[ this.getLanguageCode() ];
  },

  getLanguage: function(){
    return { code: this.getLanguageCode(), name: this.getLanguageName() };
  }

};

// Keep this file in sync with lib/dc/language.rb

dc.language = {
  NAMES: {
    'ara' : 'Arabic',
    'zho' : 'Chinese (Simplified)',
    'tra' : 'Chinese (Traditional)', // this is not a real ISO-639-2 code, see comments on language.rb
    'dan' : 'Danish',
    'eng' : 'English',
    'fra' : 'French',
    'deu' : 'German',
    'hun' : 'Hungarian',
    'ita' : 'Italian',
    'jpn' : 'Japanese',
    'kor' : 'Korean',
    'nor' : 'Norwegian',
    'por' : 'Portuguese',
    'spa' : 'Spanish',
    'swe' : 'Swedish',
    'rus' : 'Russian',
    'ukr' : 'Ukrainian'
  },
  USER: ['dan','eng','rus','spa','ukr']
};

dc.language.SUPPORTED = _.keys(dc.language.NAMES);

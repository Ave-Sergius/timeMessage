'use strict';

module.exports = {
    _isoReg: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/i,
    isStringIsoDate(timeString) {
        return this._isoReg.test(timeString);
    }
};

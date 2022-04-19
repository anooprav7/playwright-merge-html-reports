"use strict";
const wait = (sec) => new Promise((r) => setTimeout(r, sec * 1000));
const main = () => {
    [3, 2, 1].forEach(async (n) => {
        await wait(n);
        console.log('waiting' + n);
    });
    console.log('running other');
};
main();
//# sourceMappingURL=test.js.map
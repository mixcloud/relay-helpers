/* @noflow */
import QuerySetMap from "../querySetMap";


describe('QuerySetMap', () => {
    var querySetMap;

    beforeEach(() => {
        querySetMap = new QuerySetMap();
    });

    it('should use query equals to compare keys', () => {
        expect(querySetMap.keyEquals(
            {},
            {a: {}}
        )).toBe(false);
        expect(querySetMap.keyEquals(
            {b: {}},
            {a: {}}
        )).toBe(false);
        expect(querySetMap.keyEquals(
            {a: {}},
            {a: {}, c: {}}
        )).toBe(false);
        expect(querySetMap.keyEquals(
            {a: {equals: () => true}},
            {a: {equals: () => true}}
        )).toBe(true);
        expect(querySetMap.keyEquals(
            {a: {equals: () => true}, b: {equals: () => true}},
            {a: {equals: () => true}}
        )).toBe(false);
        expect(querySetMap.keyEquals(
            {a: {equals: () => true}, b: {equals: () => false}},
            {a: {equals: () => true}, b: {equals: () => false}}
        )).toBe(false);
        expect(querySetMap.keyEquals(
            {a: {equals: () => true}, b: {equals: () => true}},
            {a: {equals: () => true}, b: {equals: () => true}}
        )).toBe(true);
    });

    it('should set and get values relating to querySets', () => {
        const queryA = {};
        const queryAcopy = {equals: (other) => other === queryA || other === queryAcopy};
        queryA.equals = (other) => other === queryA || other === queryAcopy;
        const queryB = {equals: (other) => other === queryB};
        const queryBnot = {equals: (other) => other === queryBnot};

        const value1 = {};
        const value2 = {};

        // Nothing set yet
        expect(querySetMap.get({a: queryA})).toBe(undefined);

        querySetMap.set({a: queryA}, value1);
        expect(querySetMap.get({a: queryA})).toBe(value1);
        // querysets match
        expect(querySetMap.get({a: queryAcopy})).toBe(value1);
        // querysets don't match
        expect(querySetMap.get({a: queryAcopy, b: queryB})).toBe(undefined);

        querySetMap.set({b: queryB}, value2);
        expect(querySetMap.get({b: queryB})).toBe(value2);
        expect(querySetMap.get({a: queryA})).toBe(value1);
        expect(querySetMap.get({b: queryBnot})).toBe(undefined);

        expect(querySetMap.keys()).toEqual([{a: queryA}, {b: queryB}]);
        expect(querySetMap.values()).toEqual([value1, value2]);

        expect(querySetMap.indexOf({b: queryB})).toEqual(1);
        expect(querySetMap.indexOf({c: {}})).toEqual(-1);

        // Overwrite previously set value
        querySetMap.set({a: queryA}, value2);
        expect(querySetMap.get({a: queryA})).toBe(value2);
        expect(querySetMap.values()).toEqual([value2, value2]);
    });

    it('should report size', () => {
        expect(querySetMap.size).toEqual(0);
        querySetMap.set({a: {}}, {});
        expect(querySetMap.size).toEqual(1);
    });
});

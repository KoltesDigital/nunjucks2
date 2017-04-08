/**
 * Created by craig.smith on 08/04/2017.
 */
(function() {
    'use strict';

    var expect, util, Environment, Template, fs, Promise, _;

    if (typeof require !== 'undefined') {
        expect = require('expect.js');
        util = require('./util');
        Environment = require('../src/environment').Environment;
        Template = require('../src/environment').Template;
        Promise = require('bluebird');
        fs = Promise.promisifyAll(require('fs'));
        _ = require('lodash');
    }
    else {
        expect = window.expect;
        util = window.util;
        Environment = nunjucks.Environment;
        Template = nunjucks.Template;
    }

    var noop = function (){};

    var zop = function (fn) {

        return function (err) {

            if (err && !_.isArray(err)){
                fn(err);
            }
            else {
                fn();
            }

        }.bind(null);

    };

    var render = util.render;
    var equal = util.equal;

    describe('compiler', function () {

        // it('should compile templates', function (done) {
        //     Promise.each([
        //         equal('Hello world', 'Hello world'),
        //         equal('Hello world, {{ name }}',
        //             {name: 'James'},
        //             'Hello world, James'),
        //         equal('Hello world, {{name}}{{suffix}}, how are you',
        //             {
        //                 name: 'James',
        //                 suffix: ' Long'
        //             },
        //             'Hello world, James Long, how are you')
        //     ], noop).then(zop(done), zop(done));
        // });
        //
        // it('should escape newlines', function (done) {
        //     equal('foo\\nbar', 'foo\\nbar').then(done);
        // });
        //
        // it('should compile references', function (done) {
        //     Promise.each([
        //         equal('{{ foo.bar }}',
        //             {foo: {bar: 'baz'}},
        //             'baz'),
        //         equal('{{ foo["bar"] }}',
        //             {foo: {bar: 'baz'}},
        //             'baz')
        //     ], noop).then(zop(done), zop(done));
        // });
        //
        // it('should fail silently on undefined values', function (done) {
        //     Promise.each([
        //         equal('{{ foo }}', ''),
        //         equal('{{ foo.bar }}', ''),
        //         equal('{{ foo.bar.baz }}', ''),
        //         equal('{{ foo.bar.baz["biz"].mumble }}', '')
        //     ], noop).then(zop(done), zop(done));
        // });
        //
        // it('should not treat falsy values the same as undefined', function (done) {
        //     Promise.each([
        //         equal('{{ foo }}', {foo: 0}, '0'),
        //         equal('{{ foo }}', {foo: false}, 'false')
        //     ], noop).then(zop(done), zop(done));
        // });
        //
        // it('should display none as empty string', function (done) {
        //     equal('{{ none }}', '').then(done);
        // });
        //
        // it('should compile none as falsy', function(done) {
        //     equal('{% if not none %}yes{% endif %}', 'yes').then(done);
        // });
        //
        // it('should compile none as null, not undefined', function(done) {
        //     equal('{{ none|default("d", false) }}', '').then(done);
        // });
        //
        // it('should compile function calls', function(done) {
        //     equal('{{ foo("msg") }}',
        //         { foo: function(str) { return str + 'hi'; }},
        //         'msghi').then(done);
        // });
        //
        // it('should compile function calls with correct scope', function(done) {
        //     equal('{{ foo.bar() }}', {
        //         foo: {
        //             bar: function() { return this.baz; },
        //             baz: 'hello'
        //         }
        //     }, 'hello').then(done);
        // });
        //
        // it('should compile if blocks', function(done) {
        //     var tmpl = ('Give me some {% if hungry %}pizza' +
        //     '{% else %}water{% endif %}');
        //
        //     equal(tmpl, { hungry: true }, 'Give me some pizza');
        //     equal(tmpl, { hungry: false }, 'Give me some water');
        //     equal('{% if not hungry %}good{% endif %}',
        //         { hungry: false },
        //         'good');
        //
        //     equal('{% if hungry and like_pizza %}good{% endif %}',
        //         { hungry: true, like_pizza: true },
        //         'good');
        //
        //     equal('{% if hungry or like_pizza %}good{% endif %}',
        //         { hungry: false, like_pizza: true },
        //         'good');
        //
        //     equal('{% if (hungry or like_pizza) and anchovies %}good{% endif %}',
        //         { hungry: false, like_pizza: true, anchovies: true },
        //         'good');
        //
        //     equal('{% if food == "pizza" %}pizza{% endif %}' +
        //         '{% if food =="beer" %}beer{% endif %}',
        //         { food: 'beer' },
        //         'beer');
        //
        //     equal('{% if "pizza" in food %}yum{% endif %}',
        //         { food: {'pizza': true }},
        //         'yum');
        //
        //     equal('{% if pizza %}yum{% elif anchovies %}yuck{% endif %}',
        //         {pizza: true },
        //         'yum');
        //
        //     equal('{% if pizza %}yum{% elseif anchovies %}yuck{% endif %}',
        //         {pizza: true },
        //         'yum');
        //
        //     equal('{% if pizza %}yum{% elif anchovies %}yuck{% endif %}',
        //         {anchovies: true },
        //         'yuck');
        //
        //     equal('{% if pizza %}yum{% elseif anchovies %}yuck{% endif %}',
        //         {anchovies: true },
        //         'yuck');
        //
        //     equal('{% if topping == "pepperoni" %}yum{% elseif topping == "anchovies" %}' +
        //         'yuck{% else %}hmmm{% endif %}',
        //         {topping: 'sausage' },
        //         'hmmm').then(done);
        // });
        //
        // it('should compile the ternary operator', function(done) {
        //     Promise.each([equal('{{ "foo" if bar else "baz" }}', 'baz'),
        //     equal('{{ "foo" if bar else "baz" }}', { bar: true }, 'foo')], noop).then(zop(done), zop(done));
        // });
        //
        // it('should compile inline conditionals', function(done) {
        //     var tmpl = 'Give me some {{ "pizza" if hungry else "water" }}';
        //     Promise.each([
        //     equal(tmpl, { hungry: true }, 'Give me some pizza'),
        //     equal(tmpl, { hungry: false }, 'Give me some water'),
        //     equal('{{ "good" if not hungry }}',
        //         { hungry: false }, 'good'),
        //     equal('{{ "good" if hungry and like_pizza }}',
        //         { hungry: true, like_pizza: true }, 'good'),
        //     equal('{{ "good" if hungry or like_pizza }}',
        //         { hungry: false, like_pizza: true }, 'good'),
        //     equal('{{ "good" if (hungry or like_pizza) and anchovies }}',
        //         { hungry: false, like_pizza: true, anchovies: true }, 'good'),
        //     equal('{{ "pizza" if food == "pizza" }}' +
        //         '{{ "beer" if food == "beer" }}',
        //         { food: 'beer' }, 'beer')], noop).then(zop(done), zop(done));
        // });
        //
        // function runLoopTests(block, end) {
        //
        //     return Promise.each([
        //
        //     equal('{% ' + block + ' i in arr %}{{ i }}{% ' + end + ' %}',
        //         { arr: [1, 2, 3, 4, 5] }, '12345'),
        //
        //     equal('{% ' + block + ' i in arr %}{{ i }}{% else %}empty{% ' + end + ' %}',
        //         { arr: [1, 2, 3, 4, 5] }, '12345'),
        //
        //     equal('{% ' + block + ' i in arr %}{{ i }}{% else %}empty{% ' + end + ' %}',
        //         { arr: [] }, 'empty'),
        //
        //     equal('{% ' + block + ' a, b, c in arr %}' +
        //         '{{ a }},{{ b }},{{ c }}.{% ' + end + ' %}',
        //         { arr: [['x', 'y', 'z'], ['1', '2', '3']] }, 'x,y,z.1,2,3.'),
        //
        //     equal('{% ' + block + ' item in arr | batch(2) %}{{ item[0] }}{% ' + end + ' %}',
        //         { arr: ['a', 'b', 'c', 'd'] }, 'ac'),
        //
        //     equal('{% ' + block + ' k, v in { one: 1, two: 2 } %}' +
        //         '-{{ k }}:{{ v }}-{% ' + end + ' %}', '-one:1--two:2-'),
        //
        //     equal('{% ' + block + ' i in [7,3,6] %}{{ loop.index }}{% ' + end + ' %}', '123'),
        //     equal('{% ' + block + ' i in [7,3,6] %}{{ loop.index0 }}{% ' + end + ' %}', '012'),
        //     equal('{% ' + block + ' i in [7,3,6] %}{{ loop.revindex }}{% ' + end + ' %}', '321'),
        //     equal('{% ' + block + ' i in [7,3,6] %}{{ loop.revindex0 }}{% ' + end + ' %}', '210'),
        //     equal('{% ' + block + ' i in [7,3,6] %}{% if loop.first %}{{ i }}{% endif %}{% ' + end + ' %}',
        //         '7'),
        //     equal('{% ' + block + ' i in [7,3,6] %}{% if loop.last %}{{ i }}{% endif %}{% ' + end + ' %}',
        //         '6'),
        //     equal('{% ' + block + ' i in [7,3,6] %}{{ loop.length }}{% ' + end + ' %}', '333'),
        //     equal('{% ' + block + ' i in foo %}{{ i }}{% ' + end + ' %}', ''),
        //     equal('{% ' + block + ' i in foo.bar %}{{ i }}{% ' + end + ' %}', { foo: {} }, ''),
        //     equal('{% ' + block + ' i in foo %}{{ i }}{% ' + end + ' %}', { foo: null }, ''),
        //
        //     equal('{% ' + block + ' x, y in points %}[{{ x }},{{ y }}]{% ' + end + ' %}',
        //         { points: [[1,2], [3,4], [5,6]] },
        //         '[1,2][3,4][5,6]'),
        //
        //     equal('{% ' + block + ' x, y in points %}{{ loop.index }}{% ' + end + ' %}',
        //         { points: [[1,2], [3,4], [5,6]] },
        //         '123'),
        //
        //     equal('{% ' + block + ' x, y in points %}{{ loop.revindex }}{% ' + end + ' %}',
        //         { points: [[1,2], [3,4], [5,6]] },
        //         '321'),
        //
        //     equal('{% ' + block + ' k, v in items %}({{ k }},{{ v }}){% ' + end + ' %}',
        //         { items: { foo: 1, bar: 2 }},
        //         '(foo,1)(bar,2)'),
        //
        //     equal('{% ' + block + ' k, v in items %}{{ loop.index }}{% ' + end + ' %}',
        //         { items: { foo: 1, bar: 2 }},
        //         '12'),
        //
        //     equal('{% ' + block + ' k, v in items %}{{ loop.revindex }}{% ' + end + ' %}',
        //         { items: { foo: 1, bar: 2 }},
        //         '21'),
        //
        //     equal('{% ' + block + ' k, v in items %}{{ loop.length }}{% ' + end + ' %}',
        //         { items: { foo: 1, bar: 2 }},
        //         '22'),
        //
        //     equal('{% ' + block + ' item, v in items %}{% include "item.njk" %}{% ' + end + ' %}',
        //         { items: { foo: 1, bar: 2 }},
        //         'showing fooshowing bar')], noop).then(function () {
        //
        //         return render(
        //             '{% set item = passed_var %}' +
        //             '{% include "item.njk" %}\n' +
        //             '{% ' + block + ' i in passed_iter %}' +
        //             '{% set item = i %}' +
        //             '{% include "item.njk" %}\n' +
        //             '{% ' + end + ' %}',
        //             {
        //                 passed_var: 'test',
        //                 passed_iter: ['1', '2', '3']
        //             }
        //         ).then(function (res) {
        //
        //             expect(res).to.be('showing test\nshowing 1\nshowing 2\nshowing 3\n');
        //
        //         });
        //
        //     });
        //
        // }
        //
        // it('should compile for blocks', function(done) {
        //
        //     this.timeout(15000);
        //     runLoopTests('for', 'endfor').then(zop(done), zop(done));
        // });
        //
        // it('should allow overriding var with none inside nested scope', function(done) {
        //     equal('{% set var = "foo" %}' +
        //         '{% for i in [1] %}{% set var = none %}{{ var }}{% endfor %}',
        //         '').then(zop(done), zop(done));
        // });
        //
        // it('should compile asyncEach', function(done) {
        //     runLoopTests('asyncEach', 'endeach').then(zop(done), zop(done));
        // });
        //
        // it('should compile asyncAll', function(done) {
        //     runLoopTests('asyncAll', 'endall').then(zop(done), zop(done));
        // });
        //
        // it('should compile async control', function(done) {
        //     if(fs) {
        //         var opts = {
        //             asyncFilters: {
        //                 getContents: function(tmpl) {
        //
        //                     return fs.readFileAsync(tmpl);
        //                 },
        //
        //                 getContentsArr: function(arr) {
        //                     return fs.readFileAsync(arr[0]).then(function(res) {
        //                         return [res];
        //                     });
        //                 }
        //             }
        //         };
        //
        //         Promise.each([
        //         render('{{ tmpl | getContents }}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('somecontenthere');
        //             }),
        //
        //         render('{% if tmpl %}{{ tmpl | getContents }}{% endif %}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('somecontenthere');
        //             }),
        //
        //         render('{% if tmpl | getContents %}yes{% endif %}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('yes');
        //             }),
        //
        //         render('{% for t in [tmpl, tmpl] %}{{ t | getContents }}*{% endfor %}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('somecontenthere*somecontenthere*');
        //             }),
        //
        //         render('{% for t in [tmpl, tmpl] | getContentsArr %}{{ t }}{% endfor %}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('somecontenthere');
        //             }),
        //
        //         render('{% if test %}{{ tmpl | getContents }}{% endif %}oof',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('oof');
        //             }),
        //
        //         render('{% if tmpl %}' +
        //             '{% for i in [0, 1] %}{{ tmpl | getContents }}*{% endfor %}' +
        //             '{% endif %}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('somecontenthere*somecontenthere*');
        //             }),
        //
        //         render('{% block content %}{{ tmpl | getContents }}{% endblock %}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('somecontenthere');
        //             }),
        //
        //         render('{% block content %}hello{% endblock %} {{ tmpl | getContents }}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('hello somecontenthere');
        //             }),
        //
        //         render('{% block content %}{% set foo = tmpl | getContents %}{{ foo }}{% endblock %}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('somecontenthere');
        //             }),
        //
        //         render('{% block content %}{% include "async.njk" %}{% endblock %}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('somecontenthere\n');
        //             }),
        //
        //         render('{% asyncEach i in [0, 1] %}{% include "async.njk" %}{% endeach %}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('somecontenthere\nsomecontenthere\n');
        //             }),
        //
        //         render('{% asyncAll i in [0, 1, 2, 3, 4] %}-{{ i }}:{% include "async.njk" %}-{% endall %}',
        //             { tmpl: 'tests/templates/for-async-content.njk' },
        //             opts).then(function(res) {
        //                 expect(res).to.be('-0:somecontenthere\n-' +
        //                     '-1:somecontenthere\n-' +
        //                     '-2:somecontenthere\n-' +
        //                     '-3:somecontenthere\n-' +
        //                     '-4:somecontenthere\n-');
        //             })
        //         ], noop).then(zop(done), zop(done));
        //         return;
        //     }
        //     done();
        // });
        //
        // it('should compile operators', function(done) {
        //     Promise.each([
        //         equal('{{ 3 + 4 - 5 * 6 / 10 }}', '4'),
        //         equal('{{ 4**5 }}', '1024'),
        //         equal('{{ 9//5 }}', '1'),
        //         equal('{{ 9%5 }}', '4'),
        //         equal('{{ -5 }}', '-5'),
        //
        //         equal('{% if 3 < 4 %}yes{% endif %}', 'yes'),
        //         equal('{% if 3 > 4 %}yes{% endif %}', ''),
        //         equal('{% if 9 >= 10 %}yes{% endif %}', ''),
        //         equal('{% if 10 >= 10 %}yes{% endif %}', 'yes'),
        //         equal('{% if 9 <= 10 %}yes{% endif %}', 'yes'),
        //         equal('{% if 10 <= 10 %}yes{% endif %}', 'yes'),
        //         equal('{% if 11 <= 10 %}yes{% endif %}', ''),
        //
        //         equal('{% if 10 != 10 %}yes{% endif %}', ''),
        //         equal('{% if 10 == 10 %}yes{% endif %}', 'yes'),
        //
        //         equal('{% if "0" == 0 %}yes{% endif %}', 'yes'),
        //         equal('{% if "0" === 0 %}yes{% endif %}', ''),
        //         equal('{% if "0" !== 0 %}yes{% endif %}', 'yes'),
        //         equal('{% if 0 == false %}yes{% endif %}', 'yes'),
        //         equal('{% if 0 === false %}yes{% endif %}', ''),
        //
        //         equal('{% if foo(20) > bar %}yes{% endif %}',
        //             { foo: function(n) { return n - 1; },
        //                 bar: 15 },
        //             'yes'),
        //
        //         equal('{% if 1 in [1, 2] %}yes{% endif %}', 'yes'),
        //         equal('{% if 1 in [2, 3] %}yes{% endif %}', ''),
        //         equal('{% if 1 not in [1, 2] %}yes{% endif %}', ''),
        //         equal('{% if 1 not in [2, 3] %}yes{% endif %}', 'yes'),
        //         equal('{% if "a" in vals %}yes{% endif %}',
        //             {'vals': ['a', 'b']}, 'yes'),
        //         equal('{% if "a" in obj %}yes{% endif %}',
        //             {'obj': { a: true }}, 'yes'),
        //         equal('{% if "a" in obj %}yes{% endif %}',
        //             {'obj': { b: true }}, ''),
        //         equal('{% if "foo" in "foobar" %}yes{% endif %}', 'yes'),
        //
        //         render(
        //             '{% if "a" in 1 %}yes{% endif %}',
        //             {},
        //             { noThrow: true }).then(function(res) {
        //                 expect(res).to.be(undefined);
        //             }).catch(function (err) {
        //                 expect(err).to.match(
        //                     /Cannot use "in" operator to search for "a" in unexpected types\./
        //                 );
        //             }
        //         ),
        //
        //         render(
        //             '{% if "a" in obj %}yes{% endif %}',
        //             {},
        //             { noThrow: true }).then(function(res) {
        //                 expect(res).to.be(undefined);
        //             }).catch(function (err) {
        //                 expect(err).to.match(
        //                     /Cannot use "in" operator to search for "a" in unexpected types\./
        //                 );
        //             }
        //         )
        //     ], noop).then(zop(done), zop(done));
        // });
        //
        //
        // it('should compile string concatenations with tilde', function(done){
        //     Promise.each([equal('{{ 4 ~ \'hello\' }}', '4hello'),
        //     equal('{{ 4 ~ 5 }}', '45'),
        //     equal('{{ \'a\' ~ \'b\' ~ 5 }}', 'ab5')], noop).then(zop(done), zop(done));
        // });

        it('should compile macros', function(done) {
            equal('{% macro foo() %}This is a macro{% endmacro %}' +
                '{{ foo() }}',
                'This is a macro').then(zop(done), zop(done));
        });

        it('should compile macros with optional args', function(done) {
            equal('{% macro foo(x, y) %}{{ y }}{% endmacro %}' +
                '{{ foo(1) }}',
                '').then(zop(done), zop(done));
        });

        it('should compile macros with args that can be passed to filters', function(done) {
            equal('{% macro foo(x) %}{{ x|title }}{% endmacro %}' +
                '{{ foo("foo") }}',
                'Foo').then(zop(done), zop(done));
        });

        it('should compile macros with positional args', function(done) {
            equal('{% macro foo(x, y) %}{{ y }}{% endmacro %}' +
                '{{ foo(1, 2) }}',
                '2').then(zop(done), zop(done));
        });
        //
        // it('should compile macros with arg defaults', function(done) {
        //     equal('{% macro foo(x, y, z=5) %}{{ y }}{% endmacro %}' +
        //         '{{ foo(1, 2) }}',
        //         '2');
        //     equal('{% macro foo(x, y, z=5) %}{{ z }}{% endmacro %}' +
        //         '{{ foo(1, 2) }}',
        //         '5').then(zop(done), zop(done));
        // });
        //
        // it('should compile macros with keyword args', function(done) {
        //     equal('{% macro foo(x, y, z=5) %}{{ y }}{% endmacro %}' +
        //         '{{ foo(1, y=2) }}',
        //         '2').then(zop(done), zop(done));
        // });
        //
        // it('should compile macros with only keyword args', function(done) {
        //     equal('{% macro foo(x, y, z=5) %}{{ x }}{{ y }}{{ z }}' +
        //         '{% endmacro %}' +
        //         '{{ foo(x=1, y=2) }}',
        //         '125').then(zop(done), zop(done));
        // });
        //
        // it('should compile macros with keyword args overriding defaults', function(done) {
        //     equal('{% macro foo(x, y, z=5) %}{{ x }}{{ y }}{{ z }}' +
        //         '{% endmacro %}' +
        //         '{{ foo(x=1, y=2, z=3) }}',
        //         '123').then(zop(done), zop(done));
        // });
        //
        // it('should compile macros with out-of-order keyword args', function(done) {
        //     equal('{% macro foo(x, y=2, z=5) %}{{ x }}{{ y }}{{ z }}' +
        //         '{% endmacro %}' +
        //         '{{ foo(1, z=3) }}',
        //         '123').then(zop(done), zop(done));
        // });
        //
        // it('should compile macros', function(done) {
        //     equal('{% macro foo(x, y=2, z=5) %}{{ x }}{{ y }}{{ z }}' +
        //         '{% endmacro %}' +
        //         '{{ foo(1) }}',
        //         '125').then(zop(done), zop(done));
        // });
        //
        // it('should compile macros with multiple overridden arg defaults', function(done) {
        //     equal('{% macro foo(x, y=2, z=5) %}{{ x }}{{ y }}{{ z }}' +
        //         '{% endmacro %}' +
        //         '{{ foo(1, 10, 20) }}',
        //         '11020').then(zop(done), zop(done));
        // });
        //
        // it('should compile macro calls inside blocks', function(done) {
        //     equal('{% extends "base.njk" %}' +
        //         '{% macro foo(x, y=2, z=5) %}{{ x }}{{ y }}{{ z }}' +
        //         '{% endmacro %}' +
        //         '{% block block1 %}' +
        //         '{{ foo(1) }}' +
        //         '{% endblock %}',
        //         'Foo125BazFizzle').then(zop(done), zop(done));
        // });
        //
        // it('should compile macros defined in one block and called in another', function(done) {
        //     equal('{% block bar %}' +
        //         '{% macro foo(x, y=2, z=5) %}{{ x }}{{ y }}{{ z }}' +
        //         '{% endmacro %}' +
        //         '{% endblock %}' +
        //         '{% block baz %}' +
        //         '{{ foo(1) }}' +
        //         '{% endblock %}',
        //         '125').then(zop(done), zop(done));
        // });
        //
        // it('should compile macros that include other templates', function(done) {
        //     equal('{% macro foo() %}{% include "include.njk" %}{% endmacro %}' +
        //         '{{ foo() }}',
        //         { name: 'james' },
        //         'FooInclude james').then(zop(done), zop(done));
        // });
        //
        // it('should compile macros that set vars', function(done) {
        //     equal('{% macro foo() %}{% set x = "foo"%}{{ x }}{% endmacro %}' +
        //         '{% set x = "bar" %}' +
        //         '{{ x }}' +
        //         '{{ foo() }}' +
        //         '{{ x }}',
        //         'barfoobar').then(zop(done), zop(done));
        // });
        //
        // it('should not leak variables set in macro to calling scope', function(done) {
        //     equal('{% macro setFoo() %}' +
        //         '{% set x = "foo" %}' +
        //         '{{ x }}' +
        //         '{% endmacro %}' +
        //         '{% macro display() %}' +
        //         '{% set x = "bar" %}' +
        //         '{{ setFoo() }}' +
        //         '{{ x }}' +
        //         '{% endmacro %}' +
        //         '{{ display() }}',
        //         'foobar').then(zop(done), zop(done));
        // });
        //
        // it('should not leak variables set in nested scope within macro out to calling scope', function(done) {
        //     equal('{% macro setFoo() %}' +
        //         '{% for y in [1] %}{% set x = "foo" %}{{ x }}{% endfor %}' +
        //         '{% endmacro %}' +
        //         '{% macro display() %}' +
        //         '{% set x = "bar" %}' +
        //         '{{ setFoo() }}' +
        //         '{{ x }}' +
        //         '{% endmacro %}' +
        //         '{{ display() }}',
        //         'foobar').then(zop(done), zop(done));
        // });
        //
        // it('should compile macros without leaking set to calling scope', function(done) {
        //     // This test checks that the issue #577 is resolved.
        //     // If the bug is not fixed, and set variables leak into the
        //     // caller scope, there will be too many "foo"s here ("foofoofoo"),
        //     // because each recursive call will append a "foo" to the
        //     // variable x in its caller's scope, instead of just its own.
        //     equal('{% macro foo(topLevel, prefix="") %}' +
        //         '{% if topLevel %}' +
        //         '{% set x = "" %}' +
        //         '{% for i in [1,2] %}' +
        //         '{{ foo(false, x) }}' +
        //         '{% endfor %}' +
        //         '{% else %}' +
        //         '{% set x = prefix + "foo" %}' +
        //         '{{ x }}' +
        //         '{% endif %}' +
        //         '{% endmacro %}' +
        //         '{{ foo(true) }}',
        //         'foofoo').then(zop(done), zop(done));
        // });

        // it('should compile macros that cannot see variables in caller scope', function(done) {
        //     equal('{% macro one(var) %}{{ two() }}{% endmacro %}' +
        //         '{% macro two() %}{{ var }}{% endmacro %}' +
        //         '{{ one("foo") }}',
        //         '').then(zop(done), zop(done));
        // });
        //
        // it('should compile call blocks', function(done) {
        //     equal('{% macro wrap(el) %}' +
        //         '<{{ el }}>{{ caller() }}</{{ el }}>' +
        //         '{% endmacro %}' +
        //         '{% call wrap("div") %}Hello{% endcall %}',
        //         '<div>Hello</div>').then(zop(done), zop(done));
        // });
        //
        // it('should compile call blocks with args', function(done) {
        //     equal('{% macro list(items) %}' +
        //         '<ul>{% for i in items %}' +
        //         '<li>{{ caller(i) }}</li>' +
        //         '{% endfor %}</ul>' +
        //         '{% endmacro %}' +
        //         '{% call(item) list(["a", "b"]) %}{{ item }}{% endcall %}',
        //         '<ul><li>a</li><li>b</li></ul>').then(zop(done), zop(done));
        // });
        //
        // it('should compile call blocks using imported macros', function(done) {
        //     equal('{% import "import.njk" as imp %}' +
        //         '{% call imp.wrap("span") %}Hey{% endcall %}',
        //         '<span>Hey</span>').then(zop(done), zop(done));
        // });
        //
        // it('should import templates', function(done) {
        //     Promise.each([
        //     equal('{% import "import.njk" as imp %}' +
        //         '{{ imp.foo() }} {{ imp.bar }}',
        //         'Here\'s a macro baz'),
        //
        //     equal('{% from "import.njk" import foo as baz, bar %}' +
        //         '{{ bar }} {{ baz() }}',
        //         'baz Here\'s a macro'),
        //
        //     // TODO: Should the for loop create a new frame for each
        //     // iteration? As it is, `num` is set on all iterations after
        //     // the first one sets it
        //     equal('{% for i in [1,2] %}' +
        //         'start: {{ num }}' +
        //         '{% from "import.njk" import bar as num %}' +
        //         'end: {{ num }}' +
        //         '{% endfor %}' +
        //         'final: {{ num }}',
        //         'start: end: bazstart: bazend: bazfinal: ')], noop).then(zop(done), zop(done));
        // });
        //
        // it('should import template objects', function(done) {
        //     var tmpl = new Template('{% macro foo() %}Inside a macro{% endmacro %}' +
        //         '{% set bar = "BAZ" %}');
        //
        //     Promise.each([equal('{% import tmpl as imp %}' +
        //         '{{ imp.foo() }} {{ imp.bar }}',
        //         { tmpl : tmpl },
        //         'Inside a macro BAZ'),
        //
        //     equal('{% from tmpl import foo as baz, bar %}' +
        //         '{{ bar }} {{ baz() }}',
        //         { tmpl : tmpl },
        //         'BAZ Inside a macro')], noop).then(zop(done), zop(done));
        // });
        //
        // it('should import templates with context', function(done) {
        //     Promise.each([equal('{% set bar = "BAR" %}' +
        //         '{% import "import-context.njk" as imp with context %}' +
        //         '{{ imp.foo() }}',
        //         'Here\'s BAR'),
        //
        //     equal('{% set bar = "BAR" %}' +
        //         '{% from "import-context.njk" import foo with context %}' +
        //         '{{ foo() }}',
        //         'Here\'s BAR'),
        //
        //     equal('{% set bar = "BAR" %}' +
        //         '{% import "import-context-set.njk" as imp %}' +
        //         '{{ bar }}',
        //         'BAR'),
        //
        //     equal('{% set bar = "BAR" %}' +
        //         '{% import "import-context-set.njk" as imp %}' +
        //         '{{ imp.bar }}',
        //         'FOO'),
        //
        //     equal('{% set bar = "BAR" %}' +
        //         '{% import "import-context-set.njk" as imp with context %}' +
        //         '{{ bar }}{{ buzz }}',
        //         'FOO'),
        //
        //     equal('{% set bar = "BAR" %}' +
        //         '{% import "import-context-set.njk" as imp with context %}' +
        //         '{{ imp.bar }}{{ buzz }}',
        //         'FOO')], noop).then(zop(done), zop(done));
        // });

        // it('should compile block-set wrapping an inherited block', function(done) {
        //     equal('{% extends "base-set-wraps-block.njk" %}'+
        //         '{% block somevar %}foo{% endblock %}',
        //         'foo\n'
        //     ).then(zop(done), zop(done));
        // });
        //
        // it('should throw errors', function(done) {
        //     render('{% from "import.njk" import boozle %}',
        //         {},
        //         { noThrow: true }).then(function (res) {
        //             expect(res).to.be(undefined);
        //             done();
        //         })
        //         .catch(function(err) {
        //             expect(err).to.match(/cannot import 'boozle'/);
        //             done();
        //         });
        // });
        //
        // it('should allow custom tag compilation', function(done) {
        //     function testExtension() {
        //         // jshint validthis: true
        //         this.tags = ['test'];
        //
        //         this.parse = function(parser, nodes) {
        //             parser.advanceAfterBlockEnd();
        //
        //             var content = parser.parseUntilBlocks('endtest');
        //             var tag = new nodes.CallExtension(this, 'run', null, [content]);
        //             parser.advanceAfterBlockEnd();
        //
        //             return tag;
        //         };
        //
        //         this.run = function(context, content) {
        //             // Reverse the string
        //             return content().then(function (out) {
        //
        //                 return out.split('').reverse().join('');
        //
        //             });
        //         };
        //     }
        //
        //     var opts = { extensions: { 'testExtension': new testExtension() }};
        //     render('{% test %}123456789{% endtest %}', null, opts).then(function(res) {
        //         expect(res).to.be('987654321');
        //     }).then(zop(done), zop(done));
        // });
        //
        //
        // it('should allow custom tag compilation (async)', function(done) {
        //     function testExtension() {
        //         // jshint validthis: true
        //         this.tags = ['test'];
        //
        //         this.parse = function(parser, nodes) {
        //             parser.advanceAfterBlockEnd();
        //
        //             var content = parser.parseUntilBlocks('endtest');
        //             var tag = new nodes.CallExtensionAsync(this, 'run', null, [content]);
        //             parser.advanceAfterBlockEnd();
        //
        //             return tag;
        //         };
        //
        //         this.run = function(context, content) {
        //             // Reverse the string
        //             return content().then(function (out) {
        //
        //                 return out.split('').reverse().join('');
        //
        //             });
        //         };
        //     }
        //
        //     var opts = { extensions: { 'testExtension': new testExtension() }};
        //     render('{% test %}123456789{% endtest %}', null, opts).then(function(res) {
        //         expect(res).to.be('987654321');
        //     }).then(zop(done), zop(done));
        // });
        //
        //
        //
        // it('should allow custom tag compilation without content', function(done) {
        //     function testExtension() {
        //         // jshint validthis: true
        //         this.tags = ['test'];
        //
        //         this.parse = function(parser, nodes) {
        //             var tok = parser.nextToken();
        //             var args = parser.parseSignature(null, true);
        //             parser.advanceAfterBlockEnd(tok.value);
        //
        //             return new nodes.CallExtension(this, 'run', args, null);
        //         };
        //
        //         this.run = function(context, arg1) {
        //             // Reverse the string
        //             return Promise.resolve(arg1.split('').reverse().join(''));
        //         };
        //     }
        //
        //     var opts = { extensions: { 'testExtension': new testExtension() }};
        //     render('{% test "123456" %}', null, opts).then(function(res) {
        //         expect(res).to.be('654321');
        //     }).then(zop(done), zop(done));
        // });
        //
        // it('should allow complicated custom tag compilation', function(done) {
        //     function testExtension() {
        //         // jshint validthis: true
        //         this.tags = ['test'];
        //
        //         /* normally this is automatically done by Environment */
        //         this._name = 'testExtension';
        //
        //         this.parse = function(parser, nodes, lexer) {
        //             var body, intermediate = null;
        //             parser.advanceAfterBlockEnd();
        //
        //             body = parser.parseUntilBlocks('intermediate', 'endtest');
        //
        //             if(parser.skipSymbol('intermediate')) {
        //                 parser.skip(lexer.TOKEN_BLOCK_END);
        //                 intermediate = parser.parseUntilBlocks('endtest');
        //             }
        //
        //             parser.advanceAfterBlockEnd();
        //
        //             return new nodes.CallExtension(this, 'run', null, [body, intermediate]);
        //         };
        //
        //         this.run = function(context, _body, _intermediate) {
        //
        //             return Promise.all([_body(), _intermediate()]).spread(function (body, intermediate) {
        //                
        //                 var output = body.split('').join(',');
        //                 if(intermediate) {
        //                     // Reverse the string.
        //                     output += intermediate.split('').reverse().join('');
        //                 }
        //                 return output;
        //
        //             });
        //         };
        //     }
        //
        //     var opts = { extensions: { 'testExtension': new testExtension() }};
        //
        //     Promise.all([
        //     render('{% test %}abcdefg{% endtest %}', null, opts).then(function(res) {
        //         expect(res).to.be('a,b,c,d,e,f,g');
        //     }),
        //     render('{% test %}abcdefg{% intermediate %}second half{% endtest %}',
        //         null,
        //         opts).then(function(res) {
        //             expect(res).to.be('a,b,c,d,e,f,gflah dnoces');
        //         })]).then(zop(done), zop(done));
        // });
        //
        it('should allow custom tag with args compilation', function(done) {
            function testExtension() {
                // jshint validthis: true
                this.tags = ['test'];

                /* normally this is automatically done by Environment */
                this._name = 'testExtension';

                this.parse = function(parser, nodes) {
                    var body, args = null;
                    var tok = parser.nextToken();

                    // passing true makes it tolerate when no args exist
                    args = parser.parseSignature(true);
                    parser.advanceAfterBlockEnd(tok.value);

                    body = parser.parseUntilBlocks('endtest');
                    parser.advanceAfterBlockEnd();

                    return new nodes.CallExtension(this, 'run', args, [body]);
                };

                this.run = function(context, prefix, kwargs, _body) {
                    if (typeof prefix === 'function') {
                        _body = prefix;
                        prefix = '';
                        kwargs = {};
                    }
                    else if (typeof kwargs === 'function') {
                        _body = kwargs;
                        kwargs = {};
                    }

                    return _body().then(function (body) {
                        var output = prefix + body.split('').reverse().join('');
                        if (kwargs.cutoff) {
                            output = output.slice(0, kwargs.cutoff);
                        }

                        return output;
                    });
                };
            }

            var opts = {
                extensions: {
                    'testExtension': new testExtension()
                }
            };

            Promise.each([
            render('{% test %}foobar{% endtest %}', null, opts).then(function(res) {
                expect(res).to.be('raboof');
            }),

            render('{% test("biz") %}foobar{% endtest %}', null, opts).then(function(res) {
                expect(res).to.be('bizraboof');
            }),

            render('{% test("biz", cutoff=5) %}foobar{% endtest %}', null, opts).then(function(res) {
                expect(res).to.be('bizra');
            })], noop).then(zop(done), zop(done));
        });



        it('custom teg extension with lots of children', function(done) {
            function testExtension() {
                // jshint validthis: true
                this.tags = ['test'];

                /* normally this is automatically done by Environment */
                this._name = 'testExtension';

                this.parse = function(parser, nodes) {
                    var body, args = null;
                    var tok = parser.nextToken();

                    // passing true makes it tolerate when no args exist
                    args = parser.parseSignature(true);
                    parser.advanceAfterBlockEnd(tok.value);

                    body = parser.parseUntilBlocks('endtest');
                    parser.advanceAfterBlockEnd();

                    return new nodes.CallExtension(this, 'run', args, [body]);
                };

                this.run = function(context, prefix, kwargs, _body) {
                    if (typeof prefix === 'function') {
                        _body = prefix;
                        prefix = '';
                        kwargs = {};
                    }
                    else if (typeof kwargs === 'function') {
                        _body = kwargs;
                        kwargs = {};
                    }

                    return _body().then(function (body) {
                        var output = prefix + body.split('').reverse().join('');
                        if (kwargs.cutoff) {
                            output = output.slice(0, kwargs.cutoff);
                        }

                        return output;
                    });
                };
            }
            function testExtensionInnerA() {
                // jshint validthis: true
                this.tags = ['test'];

                /* normally this is automatically done by Environment */
                this._name = 'testExtension';

                this.parse = function(parser, nodes) {
                    var body, args = null;
                    var tok = parser.nextToken();

                    // passing true makes it tolerate when no args exist
                    args = parser.parseSignature(true);
                    parser.advanceAfterBlockEnd(tok.value);

                    body = parser.parseUntilBlocks('endtest');
                    parser.advanceAfterBlockEnd();

                    return new nodes.CallExtension(this, 'run', args, [body]);
                };

                this.run = function(context, prefix, kwargs, _body) {
                    if (typeof prefix === 'function') {
                        _body = prefix;
                        prefix = '';
                        kwargs = {};
                    }
                    else if (typeof kwargs === 'function') {
                        _body = kwargs;
                        kwargs = {};
                    }

                    return _body().then(function (body) {
                        var output = prefix + body.split('').reverse().join('');
                        if (kwargs.cutoff) {
                            output = output.slice(0, kwargs.cutoff);
                        }

                        return output;
                    });
                };
            }
            function testExtensionInnerB() {
                // jshint validthis: true
                this.tags = ['test'];

                /* normally this is automatically done by Environment */
                this._name = 'testExtension';

                this.parse = function(parser, nodes) {
                    var body, args = null;
                    var tok = parser.nextToken();

                    // passing true makes it tolerate when no args exist
                    args = parser.parseSignature(true);
                    parser.advanceAfterBlockEnd(tok.value);

                    body = parser.parseUntilBlocks('endtest');
                    parser.advanceAfterBlockEnd();

                    return new nodes.CallExtension(this, 'run', args, [body]);
                };

                this.run = function(context, prefix, kwargs, _body) {
                    if (typeof prefix === 'function') {
                        _body = prefix;
                        prefix = '';
                        kwargs = {};
                    }
                    else if (typeof kwargs === 'function') {
                        _body = kwargs;
                        kwargs = {};
                    }

                    return _body().then(function (body) {
                        var output = prefix + body.split('').reverse().join('');
                        if (kwargs.cutoff) {
                            output = output.slice(0, kwargs.cutoff);
                        }

                        return output;
                    });
                };
            }

            var opts = {
                extensions: {
                    'testExtension': new testExtension() ,
                    'testExtensionInnerA': new testExtensionInnerA(),
                    'testExtensionInnerB': new testExtensionInnerB()
                }
            };

            Promise.each([
                render('{% test %}foobar{% endtest %}', null, opts).then(function(res) {
                    expect(res).to.be('raboof');
                }),

                render('{% test("biz") %}foobar{% endtest %}', null, opts).then(function(res) {
                    expect(res).to.be('bizraboof');
                }),

                render('{% test("biz", cutoff=5) %}foobar{% endtest %}', null, opts).then(function(res) {
                    expect(res).to.be('bizra');
                })], noop).then(zop(done), zop(done));
        });

    });

})();
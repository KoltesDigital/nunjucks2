'use strict';

var lib = require('./lib');
var parser = require('./parser');
var transformer = require('./transformer');
var nodes = require('./nodes');
// jshint -W079
var Object = require('./object');
var Frame = require('./runtime').Frame;

// These are all the same for now, but shouldn't be passed straight
// through
var compareOps = {
    '==': '==',
    '===': '===',
    '!=': '!=',
    '!==': '!==',
    '<': '<',
    '>': '>',
    '<=': '<=',
    '>=': '>='
};

// A common pattern is to emit binary operators
function binOpEmitter(str) {
    return function(node, frame) {
        this.compile(node.left, frame);
        this.emit(str);
        this.compile(node.right, frame);
    };
}

var Compiler = Object.extend({
    init: function(templateName, throwOnUndefined) {
        this.templateName = templateName;
        this.codebuf = [];
        this.lastId = 0;
        this.buffer = null;
        this.bufferStack = [];
        this.scopeClosers = [];
        this.inBlock = false;
        this.throwOnUndefined = throwOnUndefined;
    },

    fail: function (msg, lineno, colno) {
        if (lineno !== undefined) lineno += 1;
        if (colno !== undefined) colno += 1;

        throw new lib.TemplateError(msg, lineno, colno);
    },

    pushThisBufferId: function() {
        this.bufferStack.push(this.buffer);
        this.buffer = 'this._b';
        this.emitLine(this.buffer + ' = "";');
    },

    pushBufferIdParam: function(id) {
        this.bufferStack.push(this.buffer);
        this.buffer = id;
    },

    pushBufferId: function(id) {
        this.bufferStack.push(this.buffer);
        this.buffer = id;
        this.emitLine('var ' + this.buffer + ' = "";');
    },

    popThisBufferId: function() {
        this.buffer = this.bufferStack.pop();
        return 'this._b';
    },

    popBufferId: function() {
        this.buffer = this.bufferStack.pop();
    },

    emit: function(code) {
        this.codebuf.push(code);
    },

    emitLine: function(code) {
        this.emit(code + '\n');
    },

    emitLines: function() {
        lib.each(lib.toArray(arguments), function(line) {
            this.emitLine(line);
        }, this);
    },


    emitFuncBeginAsync: function(name) {
        this.buffer = 'output';
        this.scopeClosers = [];
        this.emitLine('function ' + name + '(env, context, frame, runtime) {');
        this.emitLine('var lineno = null;');
        this.emitLine('var colno = null;');
        this.emitLine(this.makePromiseAttempt());
        this.emitLine('var ' + this.buffer + ' = "";');
    },

    emitFuncBeginAsyncBind: function(name) {
        this.buffer = 'output';
        this.scopeClosers = [];
        this.emitLine('function ' + name + '(env, context, frame, runtime) {');
        this.emitLine('var lineno = null;');
        this.emitLine('var colno = null;');
        this.emitLine(this.makePromiseAttempt());
        this.emitLine('var ' + this.buffer + ' = "";');
    },

    emitFuncBegin: function(name) {
        this.buffer = 'output';
        this.scopeClosers = [];
        this.emitLine('function ' + name + '(env, context, frame, runtime) {');
        this.emitLine('var lineno = null;');
        this.emitLine('var colno = null;');
        this.emitLine('var ' + this.buffer + ' = "";');
        this.emitLine('try {');
    },

    emitFuncEnd: function(noReturn) {
        if(!noReturn) {
            this.emitLine('return ' + this.buffer +';');
        }

        this.closeScopeLevels();
        this.emitLine('} catch (e) {');
        this.emitLine('  console.error(e, e.stack);');
        this.emitLine('  throw runtime.handleError(e, lineno, colno);');
        this.emitLine('}');
        this.emitLine('}');
        this.buffer = null;
    },

    emitFuncEndAsync: function(noReturn) {
        if(!noReturn) {
            this.emitLine('return ' + this.buffer +';');
        }
        else {
            this.emitLine('return;');
        }

        this.closeScopeLevels();
        this.emitLine('}).catch(function (e) {');
        this.emitLine('  console.error(e, e.stack);');
        this.emitLine('  throw runtime.handleError(e, lineno, colno);');
        this.emitLine('})')
        ;
        this.emitLine('}');
        this.buffer = null;
    },

    addScopeLevel: function() {
        this.scopeClosers.push('})');
    },

    closeToMyScopeLevel: function(myLevel) {
        var len = this.scopeClosers.length;
        if (!this.scopeClosers || len === 0 || len <= myLevel) return;
        this.emitLine(this.scopeClosers.splice(myLevel, len - myLevel).join('\n') + ';');
        this.scopeClosers = [];
    },

    closeScopeLevels: function() {
        if (!this.scopeClosers || this.scopeClosers.length === 0) return;
        this.emitLine(this.scopeClosers.join('\n') + ';');
        this.scopeClosers = [];
    },

    withScopedSyntax: function(func) {
        var scopeClosers = this.scopeClosers;
        this.scopeClosers = [];

        func.call(this);

        this.closeScopeLevels();
        this.scopeClosers = scopeClosers;
    },

    makeCallback: function(res) {
        var err = this.tmpid();

        return 'function(' + err + (res ? ',' + res : '') + ') {\n' +
            'if(' + err + ') { cb(' + err + '); return; }';
    },

    makePromise: function() {

        return 'return new Promise(function(resolve, reject) {\n';
    },

    makePromiseAttempt: function() {

        return 'return Promise.attempt(function() {\n';
    },

    makeThen: function(res) {

        return '.then(function(' + (res ? res : '') + ') {\n';
    },

    tmpid: function() {
        this.lastId++;
        return 't_' + this.lastId;
    },

    _templateName: function() {
        return this.templateName === null? 'undefined' : JSON.stringify(this.templateName);
    },

    _compileChildren: function(node, frame) {

        var children = node.children;
        for(var i=0, l=children.length; i<l; i++) {
            this.compile(children[i], frame);
        }

    },

    _compileAggregate: function(node, frame, startChar, endChar) {
        if(startChar) {
            this.emit(startChar);
        }

        for(var i=0; i<node.children.length; i++) {
            if(i > 0) {
                this.emit(',');
            }

            this.compile(node.children[i], frame);
        }

        if(endChar) {
            this.emit(endChar);
        }
    },

    _compileExpression: function(node, frame) {
        // TODO: I'm not really sure if this type check is worth it or
        // not.
        this.assertType(
            node,
            nodes.Literal,
            nodes.Symbol,
            nodes.Group,
            nodes.Array,
            nodes.Dict,
            nodes.FunCall,
            nodes.Caller,
            nodes.Filter,
            nodes.LookupVal,
            nodes.Compare,
            nodes.InlineIf,
            nodes.In,
            nodes.And,
            nodes.Or,
            nodes.Not,
            nodes.Add,
            nodes.Concat,
            nodes.Sub,
            nodes.Mul,
            nodes.Div,
            nodes.FloorDiv,
            nodes.Mod,
            nodes.Pow,
            nodes.Neg,
            nodes.Pos,
            nodes.Compare,
            nodes.NodeList
        );
        this.compile(node, frame);
    },

    assertType: function(node /*, types */) {
        var types = lib.toArray(arguments).slice(1);
        var success = false;

        for(var i=0; i<types.length; i++) {
            if(node instanceof types[i]) {
                success = true;
            }
        }

        if(!success) {
            this.fail('assertType: invalid type: ' + node.typename,
                      node.lineno,
                      node.colno);
        }
    },

    compileCallExtension: function(node, frame) {
        var args = node.args;
        var contentSections = node.contentSections;
        var autoescape = typeof node.autoescape === 'boolean' ? node.autoescape : true;

        this.emitLine('');

        var contentSectionsVar = this.tmpid();

        var count = 0;

        this.emitLine(contentSectionsVar + ' = {');

        var iSection = null;

        for (var section in contentSections) {

            if(count++ > 0) {
                this.emitLine(',');
            }

            iSection = contentSections[section];

            if (!iSection) {

                this.emitLine(section + ': function() { return Promise.resolve(""); }');

                continue;

            }

            var id = this.tmpid();

            this.emitLine(section + ': function() {');
            this.pushBufferId(id);
            this.emitLine('return Promise.attempt(function () {');
            this.withScopedSyntax(function () {

                this.compile(iSection, frame);

            });
            this.popBufferId();
            this.emitLine('}).then(function () { return ' + id + '; });');
            this.emitLine('}');

        }

        this.emitLine('};');


        this.emit('return env.getExtension("' + node.extName + '")["' + node.prop + '"](');
        this.emit('context');

        // if(args || contentArgs) {
        //     this.emit(',');
        // }

        if(args) {
            if(!(args instanceof nodes.NodeList)) {

                this.fail('compileCallExtension: arguments must be a NodeList, ' +
                          'use `parser.parseSignature`');
            }
            this.emit(', [');
            lib.each(args.children, function(arg, i) {
                if (i > 0) this.emit(',');
                // Tag arguments are passed normally to the call. Note
                // that keyword arguments are turned into a single js
                // object as the last argument, if they exist.
                this._compileExpression(arg, frame);
            }, this);
            this.emit(']');
        }
        else if(count > 0) {

            this.emit(', []');

        }


        if(count > 0) {
            this.emit(', ' + contentSectionsVar);
        }
        else {
            this.emit(', {}');
        }

        var res = this.tmpid();
        this.emitLine(')' + this.makeThen(res));
        this.emitLine(this.buffer + ' += runtime.suppressValue(' + res + ', ' + autoescape + ' && env.opts.autoescape)');
        this.addScopeLevel();

    },

    compileCallExtensionAsync: function(node, frame) {
        this.compileCallExtension(node, frame, true);
    },

    compileNodeList: function(node, frame) {
        this._compileChildren(node, frame);
    },

    compileLiteral: function(node) {
        if(typeof node.value === 'string') {
            var val = node.value.replace(/\\/g, '\\\\');
            val = val.replace(/"/g, '\\"');
            val = val.replace(/\n/g, '\\n');
            val = val.replace(/\r/g, '\\r');
            val = val.replace(/\t/g, '\\t');
            this.emit('"' + val  + '"');
        }
        else if (node.value === null) {
            this.emit('null');
        }
        else {
            this.emit(node.value.toString());
        }
    },

    compileSymbol: function(node, frame) {
        var name = node.value;
        var v;

        if((v = frame.lookup(name))) {
            this.emit(v);
        }
        else {
            this.emit('runtime.contextOrFrameLookup(' +
                      'context, frame, "' + name + '")');
        }
    },

    compileGroup: function(node, frame) {
        this._compileAggregate(node, frame, '(', ')');
    },

    compileArray: function(node, frame) {
        this._compileAggregate(node, frame, '[', ']');
    },

    compileDict: function(node, frame) {
        this._compileAggregate(node, frame, '{', '}');
    },

    compilePair: function(node, frame) {
        var key = node.key;
        var val = node.value;

        if(key instanceof nodes.Symbol) {
            key = new nodes.Literal(key.lineno, key.colno, key.value);
        }
        else if(!(key instanceof nodes.Literal &&
                  typeof key.value === 'string')) {
            this.fail('compilePair: Dict keys must be strings or names',
                      key.lineno,
                      key.colno);
        }

        this.compile(key, frame);
        this.emit(': ');
        this._compileExpression(val, frame);
    },

    compileInlineIf: function(node, frame) {
        this.emit('(');
        this.compile(node.cond, frame);
        this.emit('?');
        this.compile(node.body, frame);
        this.emit(':');
        if(node.else_ !== null)
            this.compile(node.else_, frame);
        else
            this.emit('""');
        this.emit(')');
    },

    compileIn: function(node, frame) {
      this.emit('runtime.inOperator(');
      this.compile(node.left, frame);
      this.emit(',');
      this.compile(node.right, frame);
      this.emit(')');
    },

    compileOr: binOpEmitter(' || '),
    compileAnd: binOpEmitter(' && '),
    compileAdd: binOpEmitter(' + '),
    // ensure concatenation instead of addition
    // by adding empty string in between
    compileConcat: binOpEmitter(' + "" + '),
    compileSub: binOpEmitter(' - '),
    compileMul: binOpEmitter(' * '),
    compileDiv: binOpEmitter(' / '),
    compileMod: binOpEmitter(' % '),

    compileNot: function(node, frame) {
        this.emit('!');
        this.compile(node.target, frame);
    },

    compileFloorDiv: function(node, frame) {
        this.emit('Math.floor(');
        this.compile(node.left, frame);
        this.emit(' / ');
        this.compile(node.right, frame);
        this.emit(')');
    },

    compilePow: function(node, frame) {
        this.emit('Math.pow(');
        this.compile(node.left, frame);
        this.emit(', ');
        this.compile(node.right, frame);
        this.emit(')');
    },

    compileNeg: function(node, frame) {
        this.emit('-');
        this.compile(node.target, frame);
    },

    compilePos: function(node, frame) {
        this.emit('+');
        this.compile(node.target, frame);
    },

    compileCompare: function(node, frame) {
        this.compile(node.expr, frame);

        for(var i=0; i<node.ops.length; i++) {
            var n = node.ops[i];
            this.emit(' ' + compareOps[n.type] + ' ');
            this.compile(n.expr, frame);
        }
    },

    compileLookupVal: function(node, frame) {
        this.emit('runtime.memberLookup((');
        this._compileExpression(node.target, frame);
        this.emit('),');
        this._compileExpression(node.val, frame);
        this.emit(')');
    },

    _getNodeName: function(node) {
        switch (node.typename) {
            case 'Symbol':
                return node.value;
            case 'FunCall':
                return 'the return value of (' + this._getNodeName(node.name) + ')';
            case 'LookupVal':
                return this._getNodeName(node.target) + '["' +
                       this._getNodeName(node.val) + '"]';
            case 'Literal':
                return node.value.toString();
            default:
                return '--expression--';
        }
    },

    compileFunCall: function(node, frame) {
        // Keep track of line/col info at runtime by settings
        // variables within an expression. An expression in javascript
        // like (x, y, z) returns the last value, and x and y can be
        // anything
        this.emit('(lineno = ' + node.lineno +
                  ', colno = ' + node.colno + ', ');

        this.emit('runtime.callWrap(');
        // Compile it as normal.
        this._compileExpression(node.name, frame);

        // Output the name of what we're calling so we can get friendly errors
        // if the lookup fails.
        this.emit(', "' + this._getNodeName(node.name).replace(/"/g, '\\"') + '", context, ');

        this._compileAggregate(node.args, frame, '[', '])');

        this.emit(')');
    },

    compileFilter: function(node, frame) {
        var name = node.name;
        this.assertType(name, nodes.Symbol);
        this.emit('env.getFilter("' + name.value + '").call(context, ');
        this._compileAggregate(node.args, frame);
        this.emitLine(')');
    },

    compileFilterAsync: function(node, frame) {
        var name = node.name;
        this.assertType(name, nodes.Symbol);

        var symbol = node.symbol.value;
        frame.set(symbol, symbol);

        this.emit('return env.getFilterAsync("' + name.value + '").call(context, ');
        this._compileAggregate(node.args, frame);
        this.emitLine(')' + this.makeThen(symbol));

        this.addScopeLevel();
    },

    compileKeywordArgs: function(node, frame) {
        var names = [];

        lib.each(node.children, function(pair) {
            names.push(pair.key.value);
        });

        this.emit('runtime.makeKeywordArgs(');
        this.compileDict(node, frame);
        this.emit(')');
    },

    compileSet: function(node, frame) {
        var ids = [];

        // Lookup the variable names for each identifier and create
        // new ones if necessary
        lib.each(node.targets, function(target) {
            var name = target.value;
            var id = frame.lookup(name);

            if (id === null || id === undefined) {
                id = this.tmpid();

                // Note: This relies on js allowing scope across
                // blocks, in case this is created inside an `if`
                this.emitLine('var ' + id + ';');
            }

            ids.push(id);
        }, this);

        if (node.value) {
            this.emit(ids.join(' = ') + ' = ');
            this._compileExpression(node.value, frame);
            this.emitLine(';');
        }
        else {
            //the async nature of these calls means we need to map the value manually after we wrap it in a callback
            //var xid = this.tmpid();
            this.compile(node.body, frame);
            //this.emitLine(this.makeThen(xid));
            this.emit(ids.join(' = ') + ' = ' + this.buffer);
            this.emitLine(';');
            this.popBufferId();
            //this.addScopeLevel();
        }

        lib.each(node.targets, function(target, i) {
            var id = ids[i];
            var name = target.value;

            // We are running this for every var, but it's very
            // uncommon to assign to multiple vars anyway
            this.emitLine('frame.set("' + name + '", ' + id + ', true);');

            this.emitLine('if(frame.topLevel) {');
            this.emitLine('context.setVariable("' + name + '", ' + id + ');');
            this.emitLine('}');

            if(name.charAt(0) !== '_') {
                this.emitLine('if(frame.topLevel) {');
                this.emitLine('context.addExport("' + name + '", ' + id + ');');
                this.emitLine('}');
            }
        }, this);
    },

    compileIfInner: function(node, frame, async) {
        this.emit('if(');
        this._compileExpression(node.cond, frame);
        this.emitLine(') {');

        this.withScopedSyntax(function() {
            this.compile(node.body, frame);

            // if(async) {
            //     this.emitLine('return resolve();');
            // }
        });

        if(node.else_) {
            this.emitLine('}\nelse {');

            this.withScopedSyntax(function() {
                this.compile(node.else_, frame);

                // if(async) {
                //     this.emit('return resolve()');
                // }
            });
        }// else if(async) {
        //     this.emitLine('}\nelse {');
        //     this.emitLine('return resolve();');
        // }

        this.emitLine('}');
    },

    compileIf : function(node, frame) {
        //force async as we use promises

        this.compileIfInner(node, frame);

    },

    compileIfAsync: function(node, frame) {
        this.emitLine(this.makePromiseAttempt());
        this.compileIfInner(node, frame, true);
        this.emit('})' + this.makeThen());
        this.addScopeLevel();
    },

    emitLoopBindings: function(node, arr, i, len) {
        var bindings = {
            index: i + ' + 1',
            index0: i,
            revindex: len + ' - ' + i,
            revindex0: len + ' - ' + i + ' - 1',
            first: i + ' === 0',
            last: i + ' === ' + len + ' - 1',
            length: len
        };

        for (var name in bindings) {
            this.emitLine('frame.set("loop.' + name + '", ' + bindings[name] + ');');
        }
    },

    compileFor: function(node, frame) {

        this._compileAsyncLoop(node, frame);

    },

    _compileAsyncLoop: function(node, frame, parallel) {
        // This shares some code with the For tag, but not enough to
        // worry about. This iterates across an object asynchronously,
        // but not in parallel.

        var i = this.tmpid();
        var len = this.tmpid();
        var arr = this.tmpid();
        var outArr = this.tmpid();
        var cleanUpFn = 'F_' + this.tmpid();
        var asyncMethod = parallel ? 'asyncAll' : 'asyncEach';
        frame = frame.push();

        this.emitLine('frame = frame.push();');

        this.emit('var ' + arr + ' = ');
        this._compileExpression(node.arr, frame);
        this.emitLine(';');

        this.emitLine('function ' + cleanUpFn + '(' + (parallel ? outArr : '') + ') {');
        if (parallel) {

            this.emitLine(this.buffer + ' += (' + outArr + ' || []).join("");');

        }
        if (node.else_) {
            this.emitLine('if (!' + arr + '.length) {');
            this.compile(node.else_, frame);
            this.emitLine('}');
        }
        this.emitLine('frame = frame.pop();');
        this.emitLine('}');

        if(node.name instanceof nodes.Array) {
            this.emit('return runtime.' + asyncMethod + '(' + arr + ', ' +
                      node.name.children.length + ', function(');

            lib.each(node.name.children, function(name) {
                this.emit(name.value + ',');
            }, this);

            this.emitLine(i + ',' + len + ') {');

            lib.each(node.name.children, function(name) {
                var id = name.value;
                frame.set(id, id);
                this.emitLine('frame.set("' + id + '", ' + id + ');');
            }, this);
        }
        else {
            var id = node.name.value;
            this.emitLine('return runtime.' + asyncMethod + '(' + arr + ', 1, function(' + id + ', ' + i + ', ' + len + ') {');
            frame.set(id, id);
            this.emitLine('frame.set("' + id + '", ' + id + ');');
        }

        this.emitLoopBindings(node, arr, i, len);

        this.withScopedSyntax(function() {
            var buf;
            if(parallel) {
                buf = this.tmpid();
                this.pushBufferId(buf);
            }

            this.compile(node.body, frame);
            if(parallel) {
                this.emitLine('return ' + buf);
                this.popBufferId();
            }
        });


        this.emitLine('}).then(' + cleanUpFn + ')' + this.makeThen());

        this.addScopeLevel();


    },

    compileAsyncEach: function(node, frame) {
        this._compileAsyncLoop(node, frame);
    },

    compileAsyncAll: function(node, frame) {
        this._compileAsyncLoop(node, frame, true);
    },

    _compileMacro: function(node) {
        var args = [];
        var kwargs = null;
        var funcId = 'macro_' + this.tmpid();

        // Type check the definition of the args
        lib.each(node.args.children, function(arg, i) {
            if(i === node.args.children.length - 1 &&
               arg instanceof nodes.Dict) {
                kwargs = arg;
            }
            else {
                this.assertType(arg, nodes.Symbol);
                args.push(arg);
            }
        }, this);

        var realNames = lib.map(args, function(n) { return 'l_' + n.value; });
        realNames.push('kwargs');

        // Quoted argument names
        var argNames = lib.map(args, function(n) { return '"' + n.value + '"'; });
        var kwargNames = lib.map((kwargs && kwargs.children) || [],
                                 function(n) { return '"' + n.key.value + '"'; });

        // We pass a function to makeMacro which destructures the
        // arguments so support setting positional args with keywords
        // args and passing keyword args as positional args
        // (essentially default values). See runtime.js.
        var frame = new Frame();
        this.emitLines(
            'var ' + funcId + ' = runtime.makeMacro(',
            '[' + argNames.join(', ') + '], ',
            '[' + kwargNames.join(', ') + '], ',
            'function (' + realNames.join(', ') + ') {',
            'var callerFrame = frame;',
            'frame = new runtime.Frame();',
            'kwargs = kwargs || {};',
            'if (kwargs.hasOwnProperty("caller")) {',
            'frame.set("caller", kwargs.caller); }'
        );

        // Expose the arguments to the template. Don't need to use
        // random names because the function
        // will create a new run-time scope for us
        lib.each(args, function(arg) {
            this.emitLine('frame.set("' + arg.value + '", ' +
                          'l_' + arg.value + ');');
            frame.set(arg.value, 'l_' + arg.value);
        }, this);

        // Expose the keyword arguments
        if(kwargs) {
            lib.each(kwargs.children, function(pair) {
                var name = pair.key.value;
                this.emit('frame.set("' + name + '", ' +
                          'kwargs.hasOwnProperty("' + name + '") ? ' +
                          'kwargs["' + name + '"] : ');
                this._compileExpression(pair.value, frame);
                this.emitLine(');');
            }, this);
        }

        var bufferId = this.tmpid();
        this.pushBufferId(bufferId);

        this.withScopedSyntax(function () {
          this.compile(node.body, frame);

            this.emitLine('frame = callerFrame;');
            this.emitLine('return new runtime.SafeString(' + bufferId + ');');
            this.emitLine('});');
        });
        this.popBufferId();

        return funcId;
    },

    compileMacro: function(node, frame) {
        var funcId = this._compileMacro(node, frame);

        // Expose the macro to the templates
        var name = node.name.value;
        frame.set(name, funcId);

        if(frame.parent) {
            this.emitLine('frame.set("' + name + '", ' + funcId + ');');
        }
        else {
            if(node.name.value.charAt(0) !== '_') {
                this.emitLine('context.addExport("' + name + '");');
            }
            this.emitLine('context.setVariable("' + name + '", ' + funcId + ');');
        }
    },

    compileCaller: function(node, frame) {
        // basically an anonymous "macro expression"
        this.emit('(function (){');
        var funcId = this._compileMacro(node, frame);
        this.emit('return ' + funcId + ';})()');
    },

    compileImport: function(node, frame) {
        var id = this.tmpid();
        var target = node.target.value;

        this.emit('return env.getTemplate(');
        this._compileExpression(node.template, frame);
        this.emitLine(', false, '+this._templateName()+', false)' + this.makeThen(id));
        this.addScopeLevel();

        this.emitLine('return ' + id + '.getExported(' +
            (node.withContext ? 'context.getVariables(), frame)' : ')') +
            this.makeThen(id));
        this.addScopeLevel();

        frame.set(target, id);

        if(frame.parent) {
            this.emitLine('frame.set("' + target + '", ' + id + ');');
        }
        else {
            this.emitLine('context.setVariable("' + target + '", ' + id + ');');
        }
    },

    compileFromImport: function(node, frame) {
        var importedId = this.tmpid();

        this.emit('return env.getTemplate(');
        this._compileExpression(node.template, frame);
        this.emitLine(', false, '+this._templateName()+', false)' + this.makeThen(importedId));
        this.addScopeLevel();

        this.emitLine('return ' + importedId + '.getExported(' +
            (node.withContext ? 'context.getVariables(), frame)' : ')') +
            this.makeThen(importedId));
        this.addScopeLevel();

        lib.each(node.names.children, function(nameNode) {
            var name;
            var alias;
            var id = this.tmpid();

            if(nameNode instanceof nodes.Pair) {
                name = nameNode.key.value;
                alias = nameNode.value.value;
            }
            else {
                name = nameNode.value;
                alias = name;
            }

            this.emitLine('if(' + importedId + '.hasOwnProperty("' + name + '")) {');
            this.emitLine('var ' + id + ' = ' + importedId + '.' + name + ';');
            this.emitLine('} else {');
            this.emitLine('throw new Error("cannot import \'' + name + '\'");');
            this.emitLine('}');

            frame.set(alias, id);

            if(frame.parent) {
                this.emitLine('frame.set("' + alias + '", ' + id + ');');
            }
            else {
                this.emitLine('context.setVariable("' + alias + '", ' + id + ');');
            }
        }, this);
    },

    compileBlock: function(node) {
        var id = this.tmpid();

        // If we are executing outside a block (creating a top-level
        // block), we really don't want to execute its code because it
        // will execute twice: once when the child template runs and
        // again when the parent template runs. Note that blocks
        // within blocks will *always* execute immediately *and*
        // wherever else they are invoked (like used in a parent
        // template). This may have behavioral differences from jinja
        // because blocks can have side effects, but it seems like a
        // waste of performance to always execute huge top-level
        // blocks twice





        if(!this.inBlock) {

            this.emit('var bv = ');

            this.emitLine('(parentTemplate ? function(e, c, f, r) { return "" } : context.getBlock("' + node.name.value + '"));');
            this.emit('return bv(env, context, frame, runtime)');
        }
        else {
            this.emit('return context.getBlock("' + node.name.value + '")');
        }

        this.emit(this.makeThen(id));

        this.emitLine(this.buffer + ' += ' + id + ';');
        this.addScopeLevel();

    },

    compileSuper: function(node, frame) {
        var name = node.blockName.value;
        var id = node.symbol.value;

        this.emitLine('return context.getSuper(env, ' +
                      '"' + name + '", ' +
                      'b_' + name + ', ' +
                      'frame, runtime)'+
                      this.makeThen(id));
        this.emitLine(id + ' = runtime.markSafe(' + id + ');');
        this.addScopeLevel();
        frame.set(id, id);
    },

    compileExtends: function(node, frame) {
        var k = this.tmpid();

        this.emit('return env.getTemplate(');
        this._compileExpression(node.template, frame);
        this.emitLine(', true, '+this._templateName()+', false)' + this.makeThen('_parentTemplate'));

        // extends is a dynamic tag and can occur within a block like
        // `if`, so if this happens we need to capture the parent
        // template in the top-level scope
        this.emitLine('parentTemplate = _parentTemplate');

        this.emitLine('for(var ' + k + ' in parentTemplate.blocks) {');
        this.emitLine('context.addBlock(' + k +
                      ', parentTemplate.blocks[' + k + ']);');
        this.emitLine('}');

        this.addScopeLevel();
    },

    compileInclude: function(node, frame) {

        this.emit('return env.getTemplate(');
        this._compileExpression(node.template, frame);
        this.emit(', false, '+this._templateName()+', ' + node.ignoreMissing + ')');
        this.emitLine('.then(function(template){');
        //this.emitLine('console.log("CONTEXT FOR TEMPLATE CALL", context);')
        this.emitLine('  return template.render(context.getVariables(), frame);');
        this.emitLine('}).then(function(result){');
        this.emitLine(  this.buffer + ' += result;');

        this.addScopeLevel();
    },

    compileTemplateData: function(node, frame) {
        this.compileLiteral(node, frame);
    },

    compileCapture: function(node, frame) {
        var bf = this.tmpid();
        this.pushBufferId(bf)
        //this.emitLine('(function() {');
        this.emitLine('var ' + this.buffer + ' = "";');
        //this.withScopedSyntax(function () {
            this.compile(node.body, frame);
        //this.emit('})');

        //this.addScopeLevel();
    },



    compileOutput: function(node, frame) {
        var children = node.children;
        for(var i=0, l=children.length; i<l; i++) {
            // TemplateData is a special case because it is never
            // autoescaped, so simply output it for optimization
            if(children[i] instanceof nodes.TemplateData) {
                if(children[i].value) {
                    this.emit(this.buffer + ' += ');
                    this.compileLiteral(children[i], frame);
                    this.emitLine(';');
                }
            }
            else {
                this.emit(this.buffer + ' += runtime.suppressValue(');
                if(this.throwOnUndefined) {
                    this.emit('runtime.ensureDefined(');
                }
                this.compile(children[i], frame);
                if(this.throwOnUndefined) {
                    this.emit(',' + node.lineno + ',' + node.colno + ')');
                }
                this.emit(', env.opts.autoescape);\n');
            }
        }
    },

    compileRoot: function(node, frame) {
        if(frame) {
            this.fail('compileRoot: root node can\'t have frame');
        }

        frame = new Frame();

        this.emitFuncBeginAsync('root');
        this.emitLine('var parentTemplate = null;');
        this._compileChildren(node, frame);
        this.emitLine('if(parentTemplate) {');
        this.emitLine('   return parentTemplate.rootRenderFunc(env, context, frame, runtime);');
        this.emitLine('}');
        this.emitFuncEndAsync();

        this.inBlock = true;

        var blockNames = [];

        var i, name, block, blocks = node.findAll(nodes.Block);
        for (i = 0; i < blocks.length; i++) {
            block = blocks[i];
            name = block.name.value;

            if (blockNames.indexOf(name) !== -1) {
                throw new Error('Block "' + name + '" defined more than once.');
            }
            blockNames.push(name);

            this.emitFuncBegin('b_' + name);
            var tmpFrame = new Frame();
            this.emitLine('var frame = frame.push(true);');
            this.compile(block.body, tmpFrame);
            this.emitFuncEnd();
        }
        this.emitLine('return {');
        for (i = 0; i < blocks.length; i++) {
            block = blocks[i];
            name = 'b_' + block.name.value;
            this.emitLine(name + ': Promise.method(' + name + '),');
        }
        this.emitLine('root: root\n};');
    },

    compile: function (node, frame) {
        //console.log('Compiling', node.typename);
        var _compile = this['compile' + node.typename];
        if(_compile) {
            _compile.call(this, node, frame);
        }
        else {
            this.fail('compile: Cannot compile node: ' + node.typename,
                      node.lineno,
                      node.colno);
        }
    },

    getCode: function() {
        return this.codebuf.join('');
    }
});

// var c = new Compiler();
// var src = 'hello {% filter title %}' +
//     'Hello madam how are you' +
//     '{% endfilter %}'
// var ast = transformer.transform(parser.parse(src));
// nodes.printNodes(ast);
// c.compile(ast);
// var tmpl = c.getCode();
// console.log(tmpl);

module.exports = {
    compile: function(src, asyncFilters, extensions, name, opts) {
        var c = new Compiler(name, opts.throwOnUndefined);

        // Run the extension preprocessors against the source.
        if(extensions && extensions.length) {
            for(var i=0; i<extensions.length; i++) {
                if('preprocess' in extensions[i]) {
                    src = extensions[i].preprocess(src, name);
                }
            }
        }

        c.compile(transformer.transform(
            parser.parse(src,
                         extensions,
                         opts),
            asyncFilters,
            name
        ));
        return c.getCode();
    },

    Compiler: Compiler
};

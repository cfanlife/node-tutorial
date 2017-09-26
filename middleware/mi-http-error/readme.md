当我们在访问一个站点的时候，如果访问的地址不存在（404），或服务器内部发生了错误（500），往往会展示给我们某个特定的页面，比如：

![404](http://upload-images.jianshu.io/upload_images/56687-598fbfa47688a723.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

那么如何在Koa中实现这种功能呢？其实一个简单的中间件即可实现，我们把它称为：http-error。实现过程并不复杂，让我们拆分为三步来看：
 - 第一步：确认需求
 - 第二步：整理思路
 - 第三步：代码实现

# 确认需求
打造一个事物前我们得先确认需要它具有什么特性，这就是需求。在这里，稍微整理下即可得到几个基本需求：
- 在页面请求出现400、500类错误码的时候，引导用户至错误页面
- 提供默认错误页面
- 允许使用者自定义错误页面

# 整理思路
确定需求后，我们要做哪些东西就很明朗了。让我们从一个请求进入Koa开始说起：
1. 一个请求访问Koa，出现了错误
2. 该错误会被http-errpr中间件捕捉到
3. 错误会被中间件的**错误处理逻辑**捕捉到，并进行处理
4. **错误处理逻辑**根据错误码状态，调用**渲染页面逻辑**
5. **渲染页面逻辑**渲染出对应的错误页面

可以看到，我们的关键点是**捕捉错误**及实现**错误处理逻辑**和**渲染页面逻辑**

# 代码实现
## 捕捉错误
该中间件第一项需要实现的功能是：捕捉到所有的http错误。根据中间件的洋葱模型，我们需要做几件事：
1. 引入http-error中间件，并将它放到洋葱模型的最外层
```
const miHttpError = require('./mi-http-error');
...
app.use(miHttpError()); 
```

2. 在http-error内部`catch`其内层中间件产生的所有错误
```
return async (ctx, next) => {
  try {
     await next();
  } catch (e) {
     /*此处进行错误处理*/
  }
}
```
上面的准备工作做完了，下面就是两个关键逻辑的实现了。

## 错误处理逻辑
**错误处理逻辑**其实很简单，就是对错误码进行判断。这段代码运行在`catch`中。
```
try {
    await next();
} catch (e) {
    /*默认错误状态为500*/
    const status = typeof e.status === 'number' ? e.status : 500;
    let fileName = status;
    /*默认错误信息为error对象上携带的message*/
    const message = e.message;
    /*对status进行处理，指定错误页面文件名*/
    if (status >= 400) {
        switch (status) {
            case 400:
            case 404:
            case 500:
                fileName = status;
                break;
            /*其他错误指定渲染other文件*/
            default:
                fileName = 'other';
        }
    }
}
```

## 渲染页面逻辑
上面的**错误处理逻辑**其实已经对我们的错误状态进行处理了，接下来就是**渲染页面逻辑**应该做的工作了。

还记得我们需要支持自定义错误文件目录吗？所以，原来调用中间件的代码需要再改一改：
```
app.use(miError({
  /*自定义错误文件夹*/
  errorPageFolder: path.resolve(__dirname, '../errorPage') 
}));
```
我们让`http-error`中间件接收一个配置对象，该对象中有一个字段`errorPageFolder`，支持我们传入自定义错误文件目录。如果用户传入了该字段，则在渲染错误页面时，去该文件夹下查找；如果用户未传入该字段，则渲染默认的模板。渲染前增加这么一段，对配置项进行处理。
```
const folder = opts.errorPageFolder; // 自定义文件夹
const templatePath = Path.resolve(__dirname, './error.html'); // 默认模板
/**
* 如果传入了错误页自定义folder，则会到自定义目录下寻找对应文件；
* 如果没有，则使用中间件自带模板，文件路径保存在templatePath中
*/
const filePath = folder ? Path.join(folder, `${fileName}.html`) : templatePath;
```
当然，我们还可以扩展配置对象，增加更多的自定义功能，不过暂且只用`errorPageFolder`字段就能满足我们的需求了。
```
try {
    /* consolidate是一个模板引擎统一库，支持几乎所有的模板引擎 */
    const data = await consolidate[engine](filePath, {
        env: env,
        status: e.status || e.message,
        error: e.message,
        stack: e.stack
    });
    ctx.status = status;
    ctx.body = data;
} catch (e) {
    ctx.throw(500, '错误页渲染失败');
}
```
上面所做的是使用渲染引擎对模板文件进行渲染，并将生成的内容放到http response中，展示在用户面前。感兴趣的同学可以去中间件源码中查看`error.html`查看模板内容（其实是从`koa-error`那里拿来稍作修改）。

# 总结
至此，我们就完成了一个最基本的http-error处理中间件。当然该中间件还不完善，尚有一些可以扩展的点，比如：
1. 不能根据请求类型及accept定制回返格式
2. 没有提供自定义错误页路由的配置
...

但还是像之前所说的，需求定义了一个事物的形态。这个中间件只是用作教学参考，不是标准形态，也不是最终形态。愿大家在实现的时候，能够多考虑当前需求和场景，打造出适合自己项目的中间件。
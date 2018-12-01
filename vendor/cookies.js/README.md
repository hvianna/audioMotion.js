Simple cookie framework
=======================


A complete cookies reader/writer with full Unicode support
----------------------------------------------------------

As cookies are just specially formatted strings it is sometimes difficult to manage them. This library aims to abstract the access to `document.cookie` by defining an object (`docCookies`) that is partially consistent with a [`Storage` object](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Storage#Storage). It also offers full Unicode support.


Usage
-----


### Writing a cookie


##### Syntax

```js
docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
```


##### Description

Create/overwrite a cookie.


##### Parameters

<dl><dt>

`name`

</dt><dd>

The [name](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#new-cookie_syntax) of the cookie to create/overwrite ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String)).

</dd><dt>

`value`

</dt><dd>

The [value](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#new-cookie_syntax) of the cookie ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String)).

</dd><dt>

`end` _(optional)_

</dt><dd>

The [`max-age`](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#new-cookie_max-age) in seconds (e.g. `31536e3` for a year, [`Infinity`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Infinity) for a never-expire cookie), or the [`expires`](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#new-cookie_expires) date in [`GMTString`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/toGMTString) format or as [`Date` object](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date); if not, the specified the cookie will expire at the end of the session ([`number`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Number) &ndash; finite or [`Infinity`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Infinity) &ndash; [`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String), [`Date` object](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date) or [`null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null)).

</dd></dl>


> **Note:** Despite [officially defined in RFC 6265](https://tools.ietf.org/html/rfc6265#section-5.2.2), the use of `max-age` is not compatible with any version of Internet Explorer, Edge and some mobile browsers. Therefore passing a number to the `end` parameter might not work as expected. A possible solution might be to convert the the relative time to an absolute time. For instance, the following code:
> 
> ```js
> docCookies.setItem("mycookie", "Hello world!", 150);
> ```
> 
> can be rewritten using an absolute date, as in the following example:
> 
> ```js
> function maxAgeToGMT (nMaxAge) {
>   return nMaxAge === Infinity ? "Fri, 31 Dec 9999 23:59:59 GMT" : (new Date(nMaxAge * 1e3 + Date.now())).toUTCString();
> }
> 
> docCookies.setItem("mycookie", "Hello world!", maxAgeToGMT(150));`
> ```
> 
> In the code above the function `maxAgeToGMT()` is used to create a [`GMTString`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/toGMTString) from a relative time (i.e., from an "age").

<dl><dt>

`path` _(optional)_

</dt><dd>

The [`path`](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#new-cookie_path) from where the cookie will be readable. E.g., `"/"`, `"/mydir"`; if not specified, defaults to the current path of the current document location ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String) or [`null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null)). The path must be _absolute_ (see [RFC 2965](http://www.ietf.org/rfc/rfc2965.txt)). For more information on how to use relative paths in this argument, see [this paragraph](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#Using_relative_URLs_in_the_path_parameter).

</dd><dt>

`domain` _(optional)_

</dt><dd>

The [`domain`](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#new-cookie_domain) from where the cookie will be readable. E.g., `"example.com"`, `".example.com"` (includes all subdomains) or `"subdomain.example.com"`; if not specified, defaults to the host portion of the current document location ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String) or [`null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null)).

</dd><dt>

`secure` _(optional)_

</dt><dd>

The cookie will be transmitted only over [`secure`](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#new-cookie_secure) protocol as https ([`boolean`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Boolean) or [`null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null)).

</dd></dl>


### Getting a cookie


##### Syntax

```js
docCookies.getItem(name)
```


##### Description

Read a cookie. If the cookie doesn't exist a [`null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null) value will be returned.


##### Parameters

<dl><dt>

`name`

</dt><dd>

The [name](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#new-cookie_syntax) of the cookie to read ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String)).

</dd></dl>


### Removing a cookie


##### Syntax

```js
docCookies.removeItem(name[, path[, domain]])
```


##### Description

Delete a cookie.


##### Parameters

<dl><dt>

`name`

</dt><dd>

The [name](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#new-cookie_syntax) of the cookie to remove ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String)).

</dd><dt>

`path` _(optional)_

</dt><dd>

E.g., `"/"`, `"/mydir"`; if not specified, defaults to the current path of the current document location ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String) or [`null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null)). The path must be _absolute_ (see [RFC 2965](http://www.ietf.org/rfc/rfc2965.txt)). For more information on how to use relative paths in this argument, see [this paragraph](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#Using_relative_URLs_in_the_path_parameter).

</dd><dt>

`domain` _(optional)_

</dt><dd>

E.g., `"example.com"`, or `"subdomain.example.com"`; if not specified, defaults to the host portion of the current document location ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String) or [`null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null)), but not including subdomains. Contrary to earlier specifications, leading dots in domain names are ignored. If a domain is specified, subdomains are always included.

</dd></dl>

**Note:** To delete cookies that span over subdomains, you need to explicitate the domain attribute in `removeItem()` as well as `setItem()`.


### Testing a cookie


##### Syntax

```js
docCookies.hasItem(name)
```


##### Description

Check whether a cookie exists in the current position.


##### Parameters

<dl><dt>

`name`

</dt><dd>

The [name](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#new-cookie_syntax) of the cookie to test ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String)).

</dd></dl>


### Getting the list of all cookies


##### Syntax

```js
docCookies.keys()
```


##### Description

Returns an array of all cookies readable from this location.


### Clear all cookies


##### Syntax

```js
docCookies.clear([path[, domain]])
```


##### Description

Clears all cookies readable from this location.


##### Parameters

<dl><dt>

`path` _(optional)_

</dt><dd>

E.g., `"/"`, `"/mydir"`; if not specified, defaults to the current path of the current document location ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String) or [`null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null)). The path must be _absolute_ (see [RFC 2965](http://www.ietf.org/rfc/rfc2965.txt)). For more information on how to use relative paths in this argument, see [this paragraph](https://developer.mozilla.org/en-US/docs/Web/API/document/cookie#Using_relative_URLs_in_the_path_parameter).

</dd><dt>

`domain` _(optional)_

</dt><dd>

E.g., `"example.com"`, or `"subdomain.example.com"`; if not specified, defaults to the host portion of the current document location ([`string`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String) or [`null`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null)), but not including subdomains. Contrary to earlier specifications, leading dots in domain names are ignored. If a domain is specified, subdomains are always included.

</dd></dl>


### Example usage:

```js
docCookies.setItem("test0", "Hello world!");
docCookies.setItem("test1", "Unicode test: \u00E0\u00E8\u00EC\u00F2\u00F9", Infinity);
docCookies.setItem("test2", "Hello world!", new Date(2020, 5, 12));
docCookies.setItem("test3", "Hello world!", new Date(2027, 2, 3), "/blog");
docCookies.setItem("test4", "Hello world!", "Wed, 19 Feb 2127 01:04:55 GMT");
docCookies.setItem("test5", "Hello world!", "Fri, 20 Aug 88354 14:07:15 GMT", "/home");
docCookies.setItem("test6", "Hello world!", 150);
docCookies.setItem("test7", "Hello world!", 245, "/content");
docCookies.setItem("test8", "Hello world!", null, null, "example.com");
docCookies.setItem("test9", "Hello world!", null, null, null, true);
docCookies.setItem("test1;=", "Safe character test;=", Infinity);

alert(docCookies.keys().join("\n"));
alert(docCookies.getItem("test1"));
alert(docCookies.getItem("test5"));
docCookies.removeItem("test1");
docCookies.removeItem("test5", "/home");
alert(docCookies.getItem("test1"));
alert(docCookies.getItem("test5"));
alert(docCookies.getItem("unexistingCookie"));
alert(docCookies.getItem());
alert(docCookies.getItem("test1;="));
```


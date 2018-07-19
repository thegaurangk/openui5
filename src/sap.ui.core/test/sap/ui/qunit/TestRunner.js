(function(window, undefined) {

	/*global CollectGarbage */

	/*
	 * Simulate the JSUnit Testsuite to collect the available
	 * test pages per Suite
	 */
	window.jsUnitTestSuite = function() {};
	window.jsUnitTestSuite.prototype.getTestPages = function() {
		return this.aPages;
	};
	window.jsUnitTestSuite.prototype.addTestPage = function(sTestPage) {
		this.aPages = this.aPages || [];
		// in case of running in the root context the testsuites right now
		// generate an invalid URL because it assumes that test-resources is
		// the context path - this section makes sure to remove the duplicate
		// test-resources segments in the path
		if (sTestPage.indexOf("/test-resources/test-resources") === 0) {
			sTestPage = sTestPage.substr("/test-resources".length);
		}
		this.aPages.push(sTestPage);
	};

	/*
	 * Template for test results
	 */
	var sResultsTemplate = "{{#tests}}" +
							"<div class=\"testResult {{outcome}}\">" +
								"<p>{{header}}</p>" +
									"<ol style=\"display: none\">" +
									"{{#results}}" +
										"<li class=\"{{result.sLiClass}} test\">" +
											"<p style=\"display: inline\">{{result.TestName}} ({{result.Failed}} ,{{result.Passed}} ,{{result.All}}) </p>" +
											"<a href=\"{{result.rerunlink}}\"> Rerun</a>" +
											"<ol>" +
											"{{#result.testmessages}}" +
												"<li class=\"{{classname}} check\">{{message}}" +
												"<br>{{expected}}" +
												"<br>{{actual}}" +
												"<br>{{diff}}" +
												"<br>{{source}}" +
												"</li>" +
											"{{/result.testmessages}}" +
											"</ol>" +
										"</li>" +
									"{{/results}}" +
									"</ol>" +
							"</div>" +
						"{{/tests}}";

	/**
	 * Utility class to find test pages and check them for being
	 * a testsuite or a QUnit testpage - also it returns the coverage
	 * results.
	 */
	window.sap = window.sap || {};
	window.sap.ui = window.sap.ui || {};
	window.sap.ui.qunit = window.sap.ui.qunit || {};
	window.sap.ui.qunit.TestRunner = {

		checkTestPage: function(sTestPage, bSequential) {

			var oPromise = new Promise(function(resolve, reject) {

				if (typeof sTestPage !== "string") {
					window.console.log("QUnit: invalid test page specified");
					reject("QUnit: invalid test page specified");
				}

				if (window.console && typeof window.console.log === "function") {
					window.console.log("QUnit: checking test page: " + sTestPage);
				}

				// check for an existing test page and check for test suite or page
				jQuery.get(sTestPage).done(function(sData) {
					if (/(?:window\.suite\s*=|function\s*suite\s*\(\s*\)\s*{)/.test(sData)
							|| (/data-sap-ui-testsuite/.test(sData) && !/sap\/ui\/test\/starter\/runTest/.test(sData)) ) {
						var $frame = jQuery("<iframe>");
						var that = this;
						$frame.css("display", "none");
						$frame.one("load", function() {
							that.findTestPages(this, bSequential).then(function(aTestPages) {
								jQuery(this).remove();
								resolve(aTestPages);
							}.bind(this), function(oError) {
								if (window.console && typeof window.console.error === "function") {
									window.console.error("QUnit: failed to load page '" + sTestPage + "'");
								}
								jQuery(this).remove();
								resolve([]);
							}.bind(this));
						});
						$frame.attr("src", sTestPage);
						$frame.appendTo(document.body);
					} else {
						resolve([sTestPage]);
					}
				}.bind(this)).fail(function(xhr,status,msg) {
					var text = (xhr ? xhr.status + " " : "") + (msg || status || 'unspecified error');
					if (window.console && typeof window.console.error === "function") {
						window.console.error("QUnit: failed to load page '" + sTestPage + "': " + text);
					}
					var oContext = this.createFailContext(sTestPage, "Testsite could not be loaded");
					this.printTestResult(oContext);
					resolve([]);
				}.bind(this));

			}.bind(this));

			oPromise.done = oPromise.then; // compat for Deferred
			oPromise.fail = oPromise.catch; // compat for Deferred

			return oPromise;

		},

		findTestPages: function(oIFrame, bSequential) {

			return Promise.resolve(oIFrame.contentWindow.suite()).then(function(oSuite) {
				var aPages = oSuite && oSuite.getTestPages() || [];
				return new Promise(function(resolve, reject) {

					try {

						if (aPages.length > 0) {

							var aTestPagePromises = [];

							if (bSequential) {

								var aTestPages = [];
								aTestPagePromises.push(aPages.reduce(function(oPromise, sTestPage) {
									return oPromise.then(this.checkTestPage.bind(this, sTestPage, bSequential)).then(function(aFoundTestPages) {
										aTestPages = aTestPages.concat(aFoundTestPages);
									});
								}.bind(this), Promise.resolve([])).then(function() {
									return aTestPages;
								}));

							} else {

								for (var i = 0, l = aPages.length; i < l; i++) {
									var sTestPage = aPages[i];
									aTestPagePromises.push(this.checkTestPage(sTestPage, bSequential));
								}

							}

							if (aTestPagePromises.length > 0) {
								Promise.all(aTestPagePromises).then(function(aFoundTestPages) {
									var aTestPages = [];
									for (var i = 0, l = aFoundTestPages.length; i < l; i++) {
										aTestPages = aTestPages.concat(aFoundTestPages[i]);
									}
									resolve(aTestPages);
								});
							}

					} else {
						resolve([]);
					}

					} catch (ex) {
						if (window.console && typeof window.console.error === "function") {
							window.console.error("QUnit: error while analyzing test page '" + oIFrame.src + "':\n" + ex);
							if ( ex.stack ) {
								window.console.error(ex.stack);
							}
						}
						resolve([]);
					}

				}.bind(this));
			}.bind(this))

		},

		runTests: function(aTestPages, nBarStep, bInternal) {

			if (!bInternal) {
				this._bStopped = false;
			}

			// TODO: stop testing

			var sTestPage = aTestPages[0];

			aTestPages = aTestPages.slice(1);

			return new Promise(function(resolve, reject) {

				if (sTestPage) {
					this.runTest(sTestPage, true, this).then(function(oResult) {
						var nBarwidth = parseFloat(jQuery("div#innerBar")[0].style.width, 10);
						var sNewwidth = nBarwidth + nBarStep + "%";
						jQuery("div#innerBar").text(Math.round(nBarwidth + nBarStep) + "%");
						jQuery("div#innerBar").width(sNewwidth);
						if (parseInt(jQuery("div#reportingHeader span.failed").text()) > 0) {
							jQuery("div#innerBar")[0].style.backgroundColor = '#ed866f';
						}
						jQuery("div#time").text(Math.round((new Date() - window.oStartTime)/1000) + " Seconds");
						jQuery("#selectedTests").find("option").each(function() {
							if (jQuery(this).text() === sTestPage) {
								jQuery(this).remove();
							}
						});
						return this.runTests(aTestPages, nBarStep, true);
					}.bind(this)).then(function() {
						resolve();
					});
				} else {
					resolve();
				}

			}.bind(this));

		},

		printTestResultAndRemoveFrame : function (oInst, $frame, $framediv, oContext) {
			var oCoverage = $frame[0].contentWindow._$blanket;

			// in case of coverage either merge it or set it on the _$blanket object
			if (oCoverage) {
				window._$blanket = window._$blanket || {};
				jQuery.each(oCoverage, function(sModule, aCoverageInfo) {
					if (!window._$blanket[sModule]) {
						window._$blanket[sModule] = aCoverageInfo;
					} else {
						jQuery.each(aCoverageInfo, function(iIndex, iCount) {
							window._$blanket[sModule][iIndex] += iCount;
						});
					}
				});
			}

			$frame[0].src = "about:blank";
			$frame[0].contentWindow.document.write('');
			$frame[0].contentWindow.close();

			if ( typeof CollectGarbage == "function") {
				CollectGarbage(); // eslint-disable-line
			}

			$framediv.remove();

			this.printTestResult(oContext);
		},

		printTestResult: function (oContext) {
			var fnTemplate = Handlebars.compile(sResultsTemplate);
			var sHTML = fnTemplate(oContext);
			var $testResult = jQuery(sHTML);
			var $children = $testResult.children();
			jQuery($children[0]).click(function() {
				jQuery(this.nextSibling).toggle();
			});
			jQuery($children[1]).find("li.test > p").click(function() {
				jQuery(this.parentElement.children[2]).toggle();
			});
			$testResult.appendTo("div.test-reporting");
		},

		runTest: function(sTestPage, bInternal, oInst) {

			if (!bInternal) {
				this._bStopped = false;
			}

			return new Promise(function(resolve, reject) {

				if (this._bStopped) {

					reject();

				} else {

					// we could make this configurable
					var $frame = jQuery("<iframe>").css({
						height: "1024px",
						width: "1280px"
					});

					$frame.attr("src", sTestPage);
					var $framediv = jQuery("<div>").css({
						height: "400px",
						width: "100%",
						overflow: "scroll"
					});
					$frame.appendTo($framediv);
					$framediv.appendTo("div.test-execution");

					var tBegin = new Date();
					var oContext;
					var fnCheckSuccess = function() {
						var doc = $frame[0].contentWindow.document;
						var $doc = jQuery(doc);
						var sTestName = $doc.find("h1#qunit-header").text();
						var $results = $doc.find("ol#qunit-tests > li");
						var $qunitBanner = $doc.find("#qunit-banner");

						if ($qunitBanner.hasClass("qunit-fail") || $qunitBanner.hasClass("qunit-pass")) {

							//IE workaround for the lack of document.baseURI property
							var baseURI = doc.location.href;

							if (sTestName == " ") {
								sTestName = "QUnit page for " + baseURI.substring(baseURI.indexOf("test-resources") +15,baseURI.length);
							}
							oContext = oInst.fnGetTestResults(sTestName, $results);
							this.printTestResultAndRemoveFrame(oInst, $frame, $framediv, oContext);

							resolve();
							return;
						}

						if (new Date() - tBegin < 300000) {
							setTimeout(fnCheckSuccess, 100);
						} else {
							var QUnit = $frame[0].contentWindow.QUnit;
							if (QUnit) {
								// push a failure and add the results that where run to the report
								oContext = oInst.fnGetTestResults(sTestName, $results);
								oContext.tests[0].header = "Testsuite was not completed after 5 minutes : " + sTestName;
								oContext.tests[0].outcome = "fail";
								oContext.tests[0].results.push(
									{
										result : {
											TestName: "Timeout occured",
											outcome: "fail",
											Failed: "1",
											Passed: "0",
											All: "1",
											rerunlink : $frame[0].contentWindow.location.href,
											sLiClass: "fail",
											testmessages: "no assertions"
										}
									}
								);
							} else {
								// No qunit print error message
								oContext = this.createFailContext($frame[0].contentWindow.location.href, "Testsite did not load QUnit after 5 minutes");
							}
							this.printTestResultAndRemoveFrame(oInst, $frame, $framediv, oContext);
							// TODO: set Test overview visible
							resolve();
						}
					}.bind(this);

					fnCheckSuccess();

				}

			}.bind(this));

		},

		createFailContext : function (sHref, sHeaderMessage) {
			this.updateResultHeader("1", "0", "1");
			return {
				tests: [{
					header: sHeaderMessage + " : " + sHref,
					outcome: "fail",
					results:[
						{
							result: {
								TestName: "No test where run",
								Failed: "1",
								Passed: "0",
								All: "1",
								rerunlink : sHref,
								sLiClass: "fail",
								testmessages: "no assertions"
							}
						}
					]
				}]
			};
		},

		stopTests: function() {
			this._bStopped = true;
		},

		hasCoverage: function() {
			return !!this.getCoverage();
		},

		getCoverage: function() {
			return window._$blanket;
		},

		getTestPageUrl: function() {
			var sTestPageUrl = this.getUrlParameter("testpage");
			var sOrigin = window.location.origin ? window.location.origin : (window.location.protocol + "//" + window.location.host);
			var sContextPath = window.location.href.substr(sOrigin.length);
			sContextPath = sContextPath.substring(0, sContextPath.indexOf("/test-resources/sap/ui/qunit/testrunner.html"));
			return sTestPageUrl || sContextPath + "/test-resources/qunit/testsuite.qunit.html";
		},

		getAutoStart: function() {
			var sAutoStart = this.getUrlParameter("autostart");
			return sAutoStart == "true";
		},

		getUrlParameter: function(sName) {
			var sTestPageUrlParam = window.location.search.substring(1),
				aUrlParameters = sTestPageUrlParam.split("&"),
				aParameter;
			for (var i = 0; i < aUrlParameters.length; i++) {
				aParameter = aUrlParameters[i].split("=");
				if (aParameter[0] == sName) {
					return decodeURIComponent(aParameter[1]);
				}
			}
		},

		updateResultHeader : function (sNumAll, sNumPassed, sNumFailed) {
			var nTotalTests = parseInt(jQuery("div#reportingHeader span.total").text());
			nTotalTests = nTotalTests + parseInt(sNumAll);
			jQuery("div#reportingHeader span.total").text(nTotalTests);

			var nPassedTests = parseInt(jQuery("div#reportingHeader span.passed").text());
			nPassedTests = nPassedTests + parseInt(sNumPassed);
			jQuery("div#reportingHeader span.passed").text(nPassedTests);

			var nFailedTests = parseInt(jQuery("div#reportingHeader span.failed").text());
			nFailedTests = nFailedTests + parseInt(sNumFailed);
			jQuery("div#reportingHeader span.failed").text(nFailedTests);
		},

		fnGetTestResults: function(sHeader, aTestResults) {

			// build the context
			var oContext = {
				tests: [{
					header: sHeader,
					outcome: "pass",
					results:[]
				}]
			};

			for (var i = 0; i < aTestResults.length; i++) {

				var $checkItems = jQuery(aTestResults[i]).find("ol > li");
				var aTestMessages = [];

				for (var y = 0; y < $checkItems.length; y++) {

					var oTestMessage = {message: "", expected: "", actual: "", diff: "", source: "", classname: $checkItems[y].className};

					if ($checkItems[y].className === "pass") {
					oTestMessage.message = jQuery($checkItems[y]).text();
					} else {
						var $messageSpan = jQuery($checkItems[y]).find("span.test-message");
						oTestMessage.message = jQuery($messageSpan[0]).text();

						var $testExpected = jQuery($checkItems[y]).find("tr.test-expected");
						if ($testExpected.length > 0) {
							oTestMessage.expected = jQuery($testExpected[0]).text();
						}

						var $testActual = jQuery($checkItems[y]).find("tr.test-actual");
						if ($testActual.length > 0) {
							oTestMessage.actual = jQuery($testActual[0]).text();
						}

						var $testDiff = jQuery($checkItems[y]).find("tr.test-diff");
						if ($testDiff.length > 0) {
							oTestMessage.diff = jQuery($testDiff[0]).text();
						}

						var $testSource = jQuery($checkItems[y]).find("tr.test-source");
						if ($testSource.length > 0) {
							oTestMessage.source = jQuery($testSource[0]).text();
						}
					}

					aTestMessages.push(oTestMessage);
				}

				var $test = jQuery(aTestResults[i]);
				var sTestSummary = $test.children("strong").text();

				var m = sTestSummary.match(/^([\S\s]*)\((\d+)(?:,\s*(\d+),\s*(\d+))?\)\s*$/);
				var sTestName;
				var sNumFailed;
				var sNumPassed;
				var sNumAll;
				// test still running
				if (!m) {
					sTestName = sTestSummary + " - Timed out and did not run completely";
					sNumFailed = "1";
				} else {
					sTestName = m[1];
					if ( m[3] || m[4] ) {
						sNumFailed = m[2];
						sNumPassed = m[3];
						sNumAll = m[4];
					} else {
						sNumPassed = sNumAll = m[2];
						sNumFailed = "0";
					}
				}

				var sRerunLink = $test.find("A").attr("href");

				var sLineItemClass = sNumFailed === "0" ? "pass" : "fail";
				if (sLineItemClass === "fail") {
					oContext.tests[0].outcome = sLineItemClass;
				}

				oContext.tests[0].results.push({result:{
					TestName: sTestName,
					Failed: sNumFailed,
					Passed: sNumPassed,
					All: sNumAll,
					rerunlink: sRerunLink,
					sLiClass: sLineItemClass,
					testmessages: aTestMessages }
				});
				this.updateResultHeader(sNumAll, sNumPassed, sNumFailed);
			}

			return oContext;

		}

	};

})(window);

/*!
 * ${copyright}
 */

sap.ui.define(['jquery.sap.global'],
	function(jQuery) {
		"use strict";

		/**
		 * Slider renderer.
		 * @namespace
		 */
		var SliderRenderer = {};

		/**
		 * CSS class to be applied to the HTML root element of the Slider control.
		 *
		 * @type {string}
		 */
		SliderRenderer.CSS_CLASS = "sapMSlider";

		/**
		 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.ui.core.Control} oSlider An object representation of the slider that should be rendered.
		 */
		SliderRenderer.render = function(oRm, oSlider) {
			var bEnabled = oSlider.getEnabled(),
				sTooltip = oSlider.getTooltip_AsString(),
				CSS_CLASS = SliderRenderer.CSS_CLASS;

			oRm.write("<div");
			this.addClass(oRm, oSlider);

			if (!bEnabled) {
				oRm.addClass(CSS_CLASS + "Disabled");
			}

			oRm.addStyle("width", oSlider.getWidth());
			oRm.writeClasses();
			oRm.writeStyles();
			oRm.writeControlData(oSlider);

			if (sTooltip && oSlider.getShowHandleTooltip()) {
				oRm.writeAttributeEscaped("title", sTooltip);
			}

			oRm.write(">");
			oRm.write('<div');
			oRm.writeAttribute("id", oSlider.getId() + "-inner");
			this.addInnerClass(oRm, oSlider);

			if (!bEnabled) {
				oRm.addClass(CSS_CLASS + "InnerDisabled");
			}

			oRm.writeClasses();
			oRm.writeStyles();
			oRm.write(">");

			if (oSlider.getProgress()) {
				this.renderProgressIndicator(oRm, oSlider);
			}

			this.renderHandles(oRm, oSlider);
			oRm.write("</div>");

			if (oSlider.getEnableTickmarks()) {
				this.renderTickmarks(oRm, oSlider);
			} else {
				// Keep the "old" labels for backwards compatibility
				this.renderLabels(oRm, oSlider);
			}

			if (oSlider.getName()) {
				this.renderInput(oRm, oSlider);
			}

			oRm.write("</div>");
		};

		SliderRenderer.renderProgressIndicator = function(oRm, oSlider) {
			oRm.write("<div");
			oRm.writeAttribute("id", oSlider.getId() + "-progress");
			this.addProgressIndicatorClass(oRm, oSlider);
			oRm.addStyle("width", oSlider._sProgressValue);
			oRm.writeClasses();
			oRm.writeStyles();
			oRm.write(' aria-hidden="true"></div>');
		};

		/**
		 * This hook method is reserved for derived classes to render more handles.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.ui.core.Control} oSlider An object representation of the slider that should be rendered.
		 */
		SliderRenderer.renderHandles = function(oRm, oSlider) {
			this.renderHandle(oRm, oSlider,  {
				id: oSlider.getId() + "-handle"
			});

			if (oSlider.getShowAdvancedTooltip()) {
				this.renderTooltips(oRm, oSlider);
			}
		};

		SliderRenderer.renderHandle = function(oRm, oSlider, mOptions) {
			var bEnabled = oSlider.getEnabled();

			oRm.write("<span");

			if (mOptions && (mOptions.id !== undefined)) {
				oRm.writeAttributeEscaped("id", mOptions.id);
			}

			if (oSlider.getShowHandleTooltip() && !oSlider.getShowAdvancedTooltip()) {
				this.writeHandleTooltip(oRm, oSlider);
			}

			this.addHandleClass(oRm, oSlider);
			oRm.addStyle(sap.ui.getCore().getConfiguration().getRTL() ? "right" : "left", oSlider._sProgressValue);
			this.writeAccessibilityState(oRm, oSlider);
			oRm.writeClasses();
			oRm.writeStyles();

			if (bEnabled) {
				oRm.writeAttribute("tabindex", "0");
			}

			oRm.write("></span>");
		};

		/**
		 * This hook method is reserved for derived classes to render more tooltips.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.ui.core.Control} oSlider An object representation of the slider that should be rendered.
		 */
		SliderRenderer.renderTooltips = function(oRm, oSlider) {

			// the tooltips container
			oRm.write("<div");
			oRm.writeAttribute("id", oSlider.getId() + "-TooltipsContainer");
			oRm.addClass(SliderRenderer.CSS_CLASS + "TooltipContainer");
			oRm.addStyle("left", "0%");
			oRm.addStyle("right", "0%");
			oRm.addStyle("min-width", "0%");
			oRm.writeClasses();
			oRm.writeStyles();
			oRm.write(">");
			this.renderTooltip(oRm, oSlider, oSlider.getInputsAsTooltips());
			oRm.write("</div>");
		};

		SliderRenderer.renderTooltip = function(oRm, oSlider, bInput) {
			if (bInput && oSlider._oInputTooltip) {
				oRm.renderControl(oSlider._oInputTooltip.tooltip);
			} else {
				oRm.write("<span");
				oRm.addClass(SliderRenderer.CSS_CLASS + "HandleTooltip");
				oRm.addStyle("width", oSlider._iLongestRangeTextWidth + "px");
				oRm.writeAttribute("id", oSlider.getId() + "-LeftTooltip");

				oRm.writeClasses();
				oRm.writeStyles();
				oRm.write(">");
				oRm.write("</span>");
			}
		};

		/**
		 * Writes the handle tooltip.
		 * To be overwritten by subclasses.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.ui.core.Control} oSlider An object representation of the control that should be rendered.
		 */
		SliderRenderer.writeHandleTooltip = function(oRm, oSlider) {
			oRm.writeAttribute("title", oSlider.toFixed(oSlider.getValue()));
		};

		SliderRenderer.renderInput = function(oRm, oSlider) {
			oRm.write('<input type="text"');
			oRm.writeAttribute("id", oSlider.getId() + "-input");
			oRm.addClass(SliderRenderer.CSS_CLASS + "Input");

			if (!oSlider.getEnabled()) {
				oRm.write("disabled");
			}

			oRm.writeClasses();
			oRm.writeAttributeEscaped("name", oSlider.getName());
			oRm.writeAttribute("value", oSlider.toFixed(oSlider.getValue()));
			oRm.write("/>");
		};

		/**
		 * Writes the accessibility state to the control.
		 * To be overwritten by subclasses.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.ui.core.Control} oSlider An object representation of the control that should be rendered.
		 */
		SliderRenderer.writeAccessibilityState = function(oRm, oSlider) {
			oRm.writeAccessibilityState(oSlider, {
				role: "slider",
				orientation: "horizontal",
				valuemin: oSlider.toFixed(oSlider.getMin()),
				valuemax: oSlider.toFixed(oSlider.getMax()),
				valuenow: oSlider.toFixed(oSlider.getValue())
			});
		};

		SliderRenderer.renderTickmarks = function (oRm, oSlider) {
			var i, iTickmarksToRender, fTickmarksDistance, iLabelsCount, fStep, fSliderSize,fSliderStep,
				oScale = oSlider.getAggregation("scale");

			if (!oSlider.getEnableTickmarks() || !oScale) {
				return;
			}

			fSliderSize = Math.abs(oSlider.getMin() - oSlider.getMax());
			fSliderStep = oSlider.getStep();

			iLabelsCount = oScale.getTickmarksBetweenLabels();
			iTickmarksToRender = oScale.calcNumTickmarks(fSliderSize, fSliderStep, oSlider._CONSTANTS.TICKMARKS.MAX_POSSIBLE);
			fTickmarksDistance = oSlider._getPercentOfValue(
				oScale.calcTickmarksDistance(iTickmarksToRender, oSlider.getMin(), oSlider.getMax(), fSliderStep));


			oRm.write("<ul class=\"" + SliderRenderer.CSS_CLASS + "Tickmarks\">");
			this.renderTickmarksLabel(oRm, oSlider, oSlider.getMin());

			for (i = 0; i < iTickmarksToRender; i++) {
				if (iLabelsCount && i > 0 && (i % iLabelsCount === 0)) {
					fStep = i * fTickmarksDistance;
					this.renderTickmarksLabel(oRm, oSlider, oSlider._getValueOfPercent(fStep));
				}

				oRm.write("<li class=\"" + SliderRenderer.CSS_CLASS + "Tick\" style=\"width: " + fTickmarksDistance + "%;\"></li>");
			}

			oRm.write("<li class=\"" + SliderRenderer.CSS_CLASS + "Tick\" style=\"width: 0%;\"></li>");
			this.renderTickmarksLabel(oRm, oSlider, oSlider.getMax());
			oRm.write("</ul>");
		};

		SliderRenderer.renderTickmarksLabel = function (oRm, oSlider, fValue) {
			var fLeft = oSlider._getPercentOfValue(fValue);
			fValue = oSlider.toFixed(fValue, oSlider.getDecimalPrecisionOfNumber(oSlider.getStep()));

			oRm.write("<li class=\"" + SliderRenderer.CSS_CLASS + "TickLabel\"");
			oRm.write(" style=\"left: " + fLeft + "%;\"");
			oRm.write(">");
			oRm.write("<div class=\"" + SliderRenderer.CSS_CLASS + "Label\">");
			oRm.writeEscaped("" + fValue);
			oRm.write("</div>");
			oRm.write("</li>");
		};

		/**
		 * This method is reserved for derived classes to add extra CSS classes to the HTML root element of the control.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.ui.core.Control} oSlider An object representation of the control that should be rendered.
		 * @since 1.36
		 */
		SliderRenderer.addClass = function(oRm, oSlider) {
			oRm.addClass(SliderRenderer.CSS_CLASS);
		};

		/**
		 * This method is reserved for derived classes to add extra CSS classes to the inner element.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.ui.core.Control} oSlider An object representation of the control that should be rendered.
		 * @since 1.38
		 */
		SliderRenderer.addInnerClass = function(oRm, oSlider) {
			oRm.addClass(SliderRenderer.CSS_CLASS + "Inner");
		};

		/**
		 * This method is reserved for derived classes to add extra CSS classes to the progress indicator element.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.ui.core.Control} oSlider An object representation of the control that should be rendered.
		 * @since 1.38
		 */
		SliderRenderer.addProgressIndicatorClass = function(oRm, oSlider) {
			oRm.addClass(SliderRenderer.CSS_CLASS + "Progress");
		};

		/**
		 * This method is reserved for derived classes to add extra CSS classes to the handle element.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.ui.core.Control} oSlider An object representation of the control that should be rendered.
		 * @since 1.38
		 */
		SliderRenderer.addHandleClass = function(oRm, oSlider) {
			oRm.addClass(SliderRenderer.CSS_CLASS + "Handle");
		};

		/**
		 * This hook method is reserved for derived classes to render the labels.
		 *
		 * @param {sap.ui.core.RenderManager} oRm The RenderManager that can be used for writing to the render output buffer.
		 * @param {sap.ui.core.Control} oSlider An object representation of the control that should be rendered.
		 */
		SliderRenderer.renderLabels = function (oRm, oSlider) {};

		return SliderRenderer;

	}, /* bExport= */ true);
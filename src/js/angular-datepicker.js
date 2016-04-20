(function() {
    'use strict';

    angular.module('720kb.datepicker', [])
	   .directive('datepicker', datepicker);

	datepicker.$inject = ['$window', '$compile', '$locale', '$filter', '$interpolate', '$timeout'];

	function datepicker($window, $compile, $locale, $filter, $interpolate, $timeout) {
		//Usage:
		//<ss-datepicker></ss-datepicker>
		var directive = {
			restrict: 'AEC',
			scope: {
                selector: '@',
                dateFormat: '@',
				dateSet: '<',
                howManyYearsToShow: '@',
				dateMinLimit: '<',
				dateMaxLimit: '<',
				dateMonthTitle: '@',
				dateYearTitle: '@',
				buttonNextTitle: '@',
				buttonPrevTitle: '@',
				dateDisabledDates: '<',
				dateSetHidden: '@',
				dateTyper: '@',
				datepickerAppendTo: '@',
				datepickerClass: '@'
			},
            link: link
        };

        return directive;

		function link($scope, element, attr) {
            var A_DAY_IN_MILLISECONDS = 86400000;
			var selector = $scope.selector;
			var defaultPrevButton = '<b class="_720kb-datepicker-default-button">&lang;</b>';
			var defaultNextButton = '<b class="_720kb-datepicker-default-button">&rang;</b>';
			var prevButton = attr.buttonPrev || defaultPrevButton;
			var nextButton = attr.buttonNext || defaultNextButton;
            var buttonPrevTitle = buttonPrevTitle || 'Prev';
            var buttonNextTitle = buttonNextTitle || 'Next';
			var dateFormat = $scope.dateFormat;
			var dateDisabledDates = getDisabledDates();
			var dateSelected = getDateSet();
			var isMouseOverCalendar = false;
			var isMouseOverInput = false;
            var isMouseOverSpan = false;
            var isCalendarOpen = false;
            var isCalendarHidden = true;
            var isPrevYearBtnEnabled = true;
            var isNextYearBtnEnabled = true;
			var htmlTemplate = generateHtmlTemplate();
			var classHelper = doHelperObject();
            var thisInput = getInputElement();
            var dateMaxLimit = getMaxDate();
            var dateMinLimit = getMinDate();
            var monthNumber = getCurrentMonthNumber();
            var highlightedDate = dateSelected.getDate();
            var thisWindow;
            var span;
            var theCalendar;
            var thisCalendarAngular;
            var datepickerID;
			//var unregisterDataSetWatcher = unregisterDataSetWatcher();
            $scope.day = getCurrentDay();
            $scope.year = getCurrentYear();
            $scope.daysInString = $locale.DATETIME_FORMATS.SHORTDAY;
			$scope.willPrevMonthBeSelectable = willPrevMonthBeSelectable;
			$scope.willNextMonthBeSelectable  = willNextMonthBeSelectable;
            $scope.nextMonth = nextMonth;
			$scope.prevMonth = prevMonth;
			$scope.setNewYear = setNewYear;
			$scope.setDatepickerDay = setDatepickerDay;
			$scope.paginateYears = paginateYears;
            $scope.prevYearPage = prevYearPage;
            $scope.nextYearPage = nextYearPage;
            $scope.toogleYearsBtn = toogleYearsBtn;
            $scope.setYearCalendarClasses = setYearCalendarClasses;

			activate();

			///////////////////////////////////////////////////////////////////

			function activate() {
                setInitialInputValue();
                setMonthTitle();
                appendCalendar();
                setupListeners();
                paginateYears();
				setDaysInMonth();
			}

            function appendCalendar() {
                //create the calendar holder and append where needed
                var htmlTemplateAngular = angular.element(htmlTemplate);
				var dtPickerClassAppend = $scope.datepickerAppendTo &&
					$scope.datepickerAppendTo.indexOf('.') !== -1;

				var dtPickerIdAppend = $scope.datepickerAppendTo &&
					$scope.datepickerAppendTo.indexOf('#') !== -1;

				var dtPickerBodyAppend = $scope.datepickerAppendTo &&
                    $scope.datepickerAppendTo === 'body';

				if (dtPickerClassAppend) {
					var dtpickerAppendTo = $scope.datepickerAppendTo.replace('.', '');
					var dtPickerElement = document.getElementsByClassName(dtpickerAppendTo)[0];
					var dtPickerAngular = angular.element(dtPickerElement);

					dtPickerAngular.append($compile(htmlTemplateAngular)
						($scope, function afterCompile(el) {
							theCalendar = angular.element(el)[0];
						})
					);
				}
				else if (dtPickerIdAppend) {
					var dtpickerAppendTo = $scope.datepickerAppendTo.replace('#', '');
					var dtPickerElement = document.getElementById(dtpickerAppendTo);
					var dtPickerAngular = angular.element(dtPickerElement);

					dtPickerAngular.append($compile(htmlTemplateAngular)
						($scope, function afterCompile(el) {
							theCalendar = angular.element(el)[0];
						})
					);
				}
				else if (dtPickerBodyAppend) {
					var bodyAngular = angular.element(document).find('body');

					bodyAngular.append($compile(htmlTemplateAngular)
						($scope, function afterCompile(el) {
							theCalendar = angular.element(el)[0];
						})
					);
				}
				else {
                    //Check if there is a input-group
                    var inputGroup = element[0].querySelector('.input-group');
                    if(inputGroup) {
                        angular.element(inputGroup).after($compile(htmlTemplateAngular)($scope));
                    } else {
                        thisInput.after($compile(htmlTemplateAngular)($scope));
                    }
					//get the calendar as element
                    theCalendar = element[0].querySelector('._720kb-datepicker-calendar');
				}
            }

            function setupListeners() {
                //some tricky dirty events to fire if click is outside of the calendar and show/hide
				//calendar when needed
                //some tricky dirty events to fire if click is outside of the calendar and
                //show/hide calendar when needed
                span = angular.element(element[0].querySelector('span'));
                thisWindow = angular.element($window);
                thisCalendarAngular = angular.element(theCalendar);

                if(isCalendarHidden) {
                    if(span) {
                        span.on('click', function () {
                            showCalendar();
                        });

                        span.on('mouseenter', function () {
                            isMouseOverSpan = true;
                        });

                        span.on('mouseleave', function () {
                            isMouseOverSpan = false;
                        });
                    }

                    thisInput.on('focus', function() {
                        showCalendar();
                    });

                    thisInput.on('mouseenter', function () {
                        isMouseOverInput = true;
                    });

                    thisInput.on('mouseleave', function () {
                        isMouseOverInput = false;
                    });

                    thisCalendarAngular.on('mouseenter', function () {
                        isMouseOverCalendar = true;
                    });

                    thisCalendarAngular.on('mouseleave', function () {
                        isMouseOverCalendar = false;
                    });
                }
                else {
                    thisInput.on('keydown', function (e) {
                        var keyPressed = e.keyCode || e.which;
                        //9 == charcode to Tab key
                        if(keyPressed == 9) {
                            if(span) {
                                span.off('click mouseenter mouseleave');
                                thisInput.off('keydown focus mouseenter mouseleave');
                                thisCalendarAngular.off('mouseenter mouseleave');
                                thisWindow.off('click');
                                hideCalendar();
                            }
                            else {
                                thisInput.off('keydown focus mouseenter mouseleave');
                                thisCalendarAngular.off('mouseenter mouseleave');
                                thisWindow.off('click');
                                hideCalendar();
                            }
                        }
                    });

                    thisWindow.on('click', function () {
                        if(span) {
                            if(!isMouseOverSpan && !isMouseOverInput && !isMouseOverCalendar) {
                                disableListeners();
                                hideCalendar();
                            }
                        }
                        else {
                            if(!isMouseOverInput && !isMouseOverCalendar) {
                                disableListeners();
                                hideCalendar();
                            }
                        }
                    });
                }

                $scope.$on('$destroy', function () {
                    if(span) span.off('click mouseenter mouseleave');
                    thisInput.off('focus mouseenter mouseleave');
                    thisCalendarAngular.off('mouseenter mouseleave');
                    thisWindow.off('click');
				});
            }

            function disableListeners() {
                if(span) span.off('click mouseenter mouseleave');
                thisInput.off('focus mouseenter mouseleave');
                thisCalendarAngular.off('mouseenter mouseleave');
                thisWindow.off('click');
            }

            function setInitialInputValue() {
                if($scope.dateSet && !$scope.dateSetHidden) setInputValue();
            }

            function getInputElement() {
				if(selector) {
					return angular.element(element[0].querySelector('.' + selector));
				}
				return angular.element(element[0].querySelector('input:first-child'));
			}

			function generateHtmlTemplate() {
                datepickerID = 'datepicker-id-' + new Date().getTime() +
                    (Math.floor(Math.random() * 6) + 8);
                var template = [];
                template.push('<div id="' + datepickerID + '" ');
                template.push('class="_720kb-datepicker-calendar');
                if($scope.datepickerClass) template.push(' ' + $scope.datepickerClass);
                if($scope.classForToggle) template.push(' ' + $scope.classForToggle);
                template.push('">');
                template.push('</div>');
                var monthAndYearHeader = generateMonthAndYearHeader();
                var yearsPaginationHeader = generateYearsPaginationHeader();
                var daysColumns = generateDaysColumns();
                var days = generateDays();

                var iterator = function iterator(aRow) {
					template.splice(template.length - 1, 0, aRow);
				};

                monthAndYearHeader.forEach(iterator);
                yearsPaginationHeader.forEach(iterator);
                daysColumns.forEach(iterator);
                days.forEach(iterator);

				template = template.join('');
                // respect previously configured interpolation symbols.
				template = template.replace(/{{/g, $interpolate.startSymbol());
				template = template.replace(/}}/g, $interpolate.endSymbol());
                return template;
			}

			function generateMonthAndYearHeader() {
                return [
                    '<div class="_720kb-datepicker-calendar-header">',
                        '<div class="_720kb-datepicker-calendar-header-left">',
                            '<a id="previousMonthBtn" class="_720kb-datepicker-calendar-month-button" href="javascript:void(0)" tabindex=-1 ng-click="prevMonth()" ng-if="willPrevMonthBeSelectable()" title="' + buttonPrevTitle + '">',
                                prevButton,
                            '</a>',
                        '</div>',
                        '<div class="_720kb-datepicker-calendar-header-middle _720kb-datepicker-calendar-month">',
                            '<strong>{{month}}</strong>&nbsp;',
                            '<a href="javascript:void(0)" tabindex=-1 ng-click="toogleYearsBtn(); showYearsPagination = !showYearsPagination; setYearCalendarClasses()">',
                                '<span>',
                                    '{{year}}',
                                    '<i id="selectYearBtn" class="_720kb-datepicker-calendar-header-closed-pagination"></i>',
                                '</span>',
                            '</a>',
                        '</div>',
                        '<div class="_720kb-datepicker-calendar-header-right">',
                            '<a id="nextMonthBtn" class="_720kb-datepicker-calendar-month-button" tabindex=-1 href="javascript:void(0)" ng-click="nextMonth()" ng-if="willNextMonthBeSelectable()" title="' + buttonNextTitle + '">',
                                nextButton,
                            '</a>',
                        '</div>',
                    '</div>'
                ];
			}

			function generateYearsPaginationHeader() {
                return [
                    '<div class="_720kb-datepicker-calendar-header" ng-if="showYearsPagination">',
                        '<div class="_720kb-datepicker-calendar-years-pagination">',
                            '<a tabindex=-1 href="javascript:void(0)" ng-click="setNewYear(y);" ng-repeat="y in paginationYears track by $index">',
                                '{{y}}',
                            '</a>',
                        '</div>',
                        '<div class="_720kb-datepicker-calendar-years-pagination-pages">',
                            '<a href="javascript:void(0)" tabindex=-1 ng-click="prevYearPage(); setYearCalendarClasses();">',
                                prevButton,
                            '</a>',
                            '<a href="javascript:void(0)" tabindex=-1 ng-click="nextYearPage(); setYearCalendarClasses();">',
                                nextButton,
                            '</a>',
                        '</div>',
                    '</div>'
                ];
			}

			function generateDaysColumns() {
				//days collumns
                return [
                    '<div class="_720kb-datepicker-calendar-days-header">',
                        '<div ng-repeat="d in ::daysInString">',
                            '{{::d}}',
                        '</div>',
                    '</div>'
                ];
			}

			function generateDays() {
                return [
                    '<div class="_720kb-datepicker-calendar-body">',
                        '<a tabindex=-1 href="javascript:void(0)" ng-repeat="px in prevMonthDays" class="_720kb-datepicker-calendar-day _720kb-datepicker-disabled">',
                            '{{::px}}',
                        '</a>',
                        '<a active-day tabindex=-1 href="javascript:void(0)" ng-repeat="item in days" ng-click="setDatepickerDay(item)" class="_720kb-datepicker-calendar-day">',
                            '{{::item}}',
                        '</a>',
                        '<a tabindex=-1 href="javascript:void(0)" ng-repeat="nx in nextMonthDays" class="_720kb-datepicker-calendar-day _720kb-datepicker-disabled">',
                            '{{::nx}}',
                        '</a>',
                    '</div>'
                ];
			}

			function resetToMinDate() {
	            monthNumber = dateMinLimit.getMonth();
	            $scope.day = dateMinLimit.getDate();
                $scope.year = dateMinLimit.getFullYear();
			}

			function resetToMaxDate() {
            	monthNumber = dateMaxLimit.getMonth();
            	$scope.day = dateMaxLimit.getDate();
                $scope.year = dateMaxLimit.getFullYear();
			}

			function prevYear() {
				$scope.year = Number($scope.year) - 1;
			}

			function nextYear() {
				$scope.year = Number($scope.year) + 1;
			}

			function setInputValue() {
				dateSelected = new Date($scope.year, monthNumber, $scope.day);

				if(!isSelectableMinDate(dateSelected) && !isSelectableMaxDate(dateSelected)) return;

				//var modelDate = new Date(date);
				if (dateFormat) thisInput.val($filter('date')(dateSelected, dateFormat));
				else {
                    thisInput.val(dateSelected);
                }
				thisInput.triggerHandler('input');
				thisInput.triggerHandler('change');
			}

			function doHelperObject() {
				return {
					add: add,
					remove: remove
				};

				function add(ele, klass) {
					if(ele.className.indexOf(klass) > -1) return;

					var classes = ele.className.split(' ');
					classes.push(klass);
					ele.className = classes.join(' ');
				}

				function remove(ele, klass) {
					if(ele.className.indexOf(klass) === -1) return;

					var classes = ele.className.split(' ');
					for(let i = 0; i < classes.length; i++) {
						if(classes[i] === klass) {
							classes = classes.slice(0,i).concat(classes.slice(i+1));
							break;
						}
					}

					ele.className = classes.joins(' ');
				}
			}

			function showCalendar() {
                isCalendarOpen = true;
                isCalendarHidden = false;
                var className = '_720kb-datepicker-calendar';
				var classOpen = '_720kb-datepicker-open';
				var pageDatepickers = $window.document.getElementById(datepickerID);
                pageDatepickers = angular.element(pageDatepickers);
                pageDatepickers.addClass(classOpen);
                setupListeners();
			}

			function setDaysInMonth() {
                var month = monthNumber;
                var year = $scope.year;
                var lastDayDate = new Date(year, month + 1, 0);
                var firstDayDate = new Date(year, month);
                var lastDayWeekNumber = lastDayDate.getDay();
                var firstDayWeekNumber = firstDayDate.getDay();
                var lastDayNumber = lastDayDate.getDate();
                var firstDayNumber = firstDayDate.getDate();
				var prevMonthDays = [];
				var nextMonthDays = [];
                var enabledDays = [];

				for(let i = 1; i <= lastDayNumber; i++) {
					enabledDays.push(i);
				}

				if(firstDayWeekNumber !== 0 ){
                    var previousMonthDate = new Date(year, month, 0);
                    var previousMonthLastDayDate = previousMonthDate.getDate();
                    var previousMonthlastDayWeekDay = previousMonthDate.getDay();
                    for(let i = previousMonthlastDayWeekDay; i >= 0; i--) {
                        prevMonthDays.push(previousMonthLastDayDate - i);
                    }
				}

				if(lastDayWeekNumber < 6) {
                    var howManyNextDays = 6 - lastDayWeekNumber;
					for(let i = 1; i <= howManyNextDays; i++) {
						nextMonthDays.push(i);
					}
				}

                $scope.prevMonthDays = prevMonthDays;
				$scope.nextMonthDays = nextMonthDays;
                $scope.days = enabledDays;
                setDaysClass();
			}

            function setDaysClass() {
                $timeout(function(){
                    var active = '_720kb-datepicker-active';
                    var disabled = '_720kb-datepicker-disabled';
                    var daysElement = element[0].querySelectorAll('a[active-day]');
                    if(!daysElement || daysElement.length == 0) return;
                    angular.forEach(daysElement, function(day) {
                        day = angular.element(day);
                        var date = new Date($scope.year, monthNumber, Number(day.html()));
                        var shouldDisable = !isSelectableMinDate(date) ||
                            !isSelectableMaxDate(date) || !isSelectableDate(date);
                        day.removeClass(active);
                        day.removeClass(disabled);
                        if($scope.day == day.html() && highlightedDate) day.addClass(active);
                        if(shouldDisable) day.addClass(disabled);
                    });
                });
            }

			function nextMonth() {
				if(monthNumber === 11) {
					monthNumber = 0;
					nextYear();
				}
				else {
					monthNumber += 1;
				}

				if(dateMaxLimit) {
					var date = new Date($scope.year,monthNumber,$scope.days[0]);
					if(!isSelectableMaxDate(date)) resetToMaxDate();
				}

                setMonthTitle();
                unselectDay();
                setDaysInMonth();
                //deactivate selected day
                //$scope.day = undefined;
                /*
                if(willPrevMonthBeSelectable()) showPreviousMonthButton();
                if(!willNextMonthBeSelectable()) hideNextMonthButton();
                */
			}

            function hideNextMonthButton() {
                var button = angular.element(element[0].querySelector('#nextMonthBtn'));
                button.addClass('_720kb-datepicker-item-hidden');
            }

            function showNextMonthButton() {
                var button = angular.element(element[0].querySelector('#nextMonthBtn'));
                button.removeClass('_720kb-datepicker-item-hidden');
            }

            function setMonthTitle() {
                var month = $filter('date')(new Date($scope.year, monthNumber), 'MMMM');
                $scope.month = month[0].toUpperCase() + month.substr(1,month.length -1);
            }

			function willPrevMonthBeSelectable() {
				var monthNumberTest = monthNumber;
				var year = $scope.year;
				var date = new Date(year, monthNumberTest, 1).getTime();
				//get last day in previous month
				var prevDay = $filter('date')(new Date(date - A_DAY_IN_MILLISECONDS), 'dd');

				if (monthNumberTest === 0) {
            		monthNumberTest = 11;
					year = year - 1;
				}
				else {
					monthNumberTest -= 1;
				}

				if (dateMinLimit) {
					var date = new Date(year, monthNumberTest, prevDay);
					return isSelectableMinDate(date);
				}

				return true;
			}

			function willNextMonthBeSelectable() {
				var monthNumberTest = monthNumber;
				var year = $scope.year;

				if (monthNumberTest === 11) {
					monthNumberTest = 0;
					year += 1;
				}
				else {
					monthNumberTest += 1;
				}

				if (dateMaxLimit) {
					var date = new Date(year, monthNumberTest, 1);
					return isSelectableMaxDate(date);
				}

				return true;
	        }

			function prevMonth() {
				if (monthNumber === 0) {
					monthNumber = 11;
					//its happy new year
					prevYear();
				}
				else {
					monthNumber -= 1;
				}
				//check if min date is ok
				if (dateMinLimit) {
					var year = $scope.year;
					//var monthNumber = $scope.monthNumber;
					var days = $scope.days[$scope.days.length - 1];
					var date = new Date($scope.year, monthNumber, $scope.day - 1);
					if (!isSelectableMinDate(date)) resetToMinDate();
				}

				setMonthTitle();
                unselectDay();
				setDaysInMonth();
			}

            function unselectDay() {
                var selectedDate = new Date(dateSelected.getFullYear(), dateSelected.getMonth());
                var calendarDate = new Date($scope.year, monthNumber);
                if(selectedDate.getTime() !== calendarDate.getTime()) {
                    highlightedDate = undefined;
                }
                else {
                    highlightedDate = dateSelected.getDate();
                }
            }

            function showPreviousMonthButton() {
                var button = angular.element(element[0].querySelector('#previousMonthBtn'));
                button.removeClass('_720kb-datepicker-item-hidden');
            }

            function hidePreviousMonthButton() {
                var button = angular.element(element[0].querySelector('#previousMonthBtn'));
                button.addClass('_720kb-datepicker-item-hidden');
            }

			function manageSelectedMonthHandle(selectedMonthNumber) {
				var date = selectedMonthNumber + '/01/2000';
				monthNumber = Number($filter('date')(new Date(date), 'MM'));
				setDaysInMonth();
				setInputValue();
			}

			function setNewYear(year) {
				//deactivate selected day
                var movingForward = $scope.year < Number(year);
                var movingBackwards = $scope.year > Number(year);
                var standingStill = $scope.year === Number(year);
                if(standingStill) return;

                if(movingForward) {
                    if (dateMaxLimit) {
                        if(!isSelectableMaxYear(year)) return;
                        var date = new Date(year, dateSelected.getMonth(), $scope.day);
                        $scope.year = year;
                        if(!isSelectableMaxDate(date)) resetToMaxDate();
                    }
                }

                if(movingBackwards) {
                    if (dateMinLimit) {
                        if(!isSelectableMinYear(year)) return;
                        var date = new Date(year, dateSelected.getMonth(), $scope.day);
                        date.setFullYear(year);
                        $scope.year = year;
                        if(!isSelectableMinDate(date)) resetToMinDate();
                    }
                }
                setMonthTitle();
                unselectDay();
                setDaysInMonth();
                paginateYears();
				$scope.showYearsPagination = false;
                toogleYearsBtn();
                setYearCalendarClasses();
	        }

			function hideCalendar() {
                var classOpen = '_720kb-datepicker-open';
                isCalendarHidden = true;
                isCalendarOpen = false;

                $timeout(function(){
                    angular.element(theCalendar).removeClass(classOpen);
                });
                disableListeners();
                setupListeners();
			}

			function setDatepickerDay(day) {
				var rangeDate = new Date($scope.year, monthNumber, day);
				var isValid = isSelectableDate(rangeDate) &&
					isSelectableMaxDate(rangeDate) &&
					isSelectableMinDate(rangeDate);

				if (isValid) {
					$scope.day = Number(day);
                	setInputValue();

					if (attr.hasOwnProperty('dateRefocus')) {
						thisInput[0].focus();
            		}
                    setDaysClass();
					hideCalendar();
				}

        	}

			function paginateYears() {
                var startingYear = $scope.year;
                var yearsToShow = $scope.howManyYearsToShow? $scope.howManyYearsToShow : 20;
                yearsToShow = Math.ceil(yearsToShow/2);
				var theNewYears = [];
				var yearsToPrepend = yearsToShow;
				var yearsToAppend = yearsToShow;

				$scope.paginationYears = [];

				for (let i = yearsToPrepend; i > 0; i -= 1) {
					theNewYears.push(Number(startingYear) - i);
				}

				for (let i = 0; i < yearsToAppend; i += 1) {
	            	theNewYears.push(Number(startingYear) + i);
				}
				//date typing in input date-typer
                /*
				if ($scope.dateTyper === 'true') {
	            	thisInput.on('keyup blur', function onTyping() {
						if (thisInput[0].value && thisInput[0].value.length &&
		                thisInput[0].value.length > 0) {

							try {
								date = new Date(thisInput[0].value.toString());
								var isValid = date.getFullYear() && date.getDay() &&
									!isNaN(date.getMonth()) && isSelectableDate(date) &&
									isSelectableMaxDate(date) &&
									isSelectableMinDate(date);

								if (isValid) {
									$scope.$apply(function applyTyping() {
										//december-November like
										$scope.month = $filter('date')(date, 'MMMM');
										// 01-12 like
										monthNumber = Number($filter('date')(date, 'MM'));
										//01-31 like
										$scope.day = Number($filter('date')(date, 'dd'));
										if (date.getFullYear().toString().length === 4) {
											//2014 like
											$scope.year = Number($filter('date')(date, 'yyyy'));
										}
										setDaysInMonth();
									});
								}
							}
							catch (e) {
								return e;
							}
						}
	            	});
				}
                */
				//check range dates
				$scope.paginationYears = theNewYears;
                var minYear = new Date(theNewYears[0], 0).getFullYear();
                var maxYear = new Date(theNewYears[theNewYears.length - 1], 0).getFullYear();
                isPrevYearBtnEnabled = isSelectableMinYear(minYear);
                isNextYearBtnEnabled = isSelectableMaxYear(maxYear);
	        }

            function prevYearPage() {
                var total = $scope.howManyYearsToShow? $scope.howManyYearsToShow : 20;
                var pace = Math.ceil(total/2);
				var theNewYears = generateYears(pace, $scope.paginationYears[0]);
                var hasSelectablePrevYears = false;
                var hasSelectableNextYears = false;


                generateYears(pace,theNewYears[0]).forEach(function(year) {
                    if(isSelectableMinYear(new Date(year, 0).getFullYear())){
                        hasSelectablePrevYears = true;
                    }
                });

                generateYears(pace,theNewYears[pace] + pace).forEach(function(year) {
                    if(isSelectableMaxYear(new Date(year, 0).getFullYear())) {
                        hasSelectableNextYears = true;
                    }
                });

                $scope.paginationYears = theNewYears;
                isNextYearBtnEnabled = hasSelectableNextYears;
                isPrevYearBtnEnabled = hasSelectablePrevYears;
            }

            function nextYearPage() {
                var total = $scope.howManyYearsToShow? $scope.howManyYearsToShow : 20;
                var pace = Math.ceil(total/2);
				var theNewYears = generateYears(pace, $scope.paginationYears[pace] + pace);
                var hasSelectablePrevYears = false;
                var hasSelectableNextYears = false;

                generateYears(pace,theNewYears[0]).forEach(function(year) {
                    if(isSelectableMinYear(new Date(year, 0).getFullYear())) {
                        hasSelectablePrevYears = true;
                    }
                });

                generateYears(pace,theNewYears[pace] + pace).forEach(function(year) {
                    if(isSelectableMaxYear(new Date(year, 0).getFullYear())) {
                        hasSelectableNextYears = true;
                    }
                });

                $scope.paginationYears = theNewYears;
                isNextYearBtnEnabled = hasSelectableNextYears;
                isPrevYearBtnEnabled = hasSelectablePrevYears;
            }

            function generateYears(pace, baseYear) {
                var theNewYears = [];

                for (let i = pace; i > 0; i -= 1) {
					theNewYears.push(Number(baseYear) - i);
				}

				for (let i = 0; i < pace; i += 1) {
	            	theNewYears.push(Number(baseYear) + i);
				}
                return theNewYears;
            }

            function setYearCalendarClasses() {
                if(!$scope.showYearsPagination) return;
                $timeout(function(){
                    var yearPageClass = '_720kb-datepicker-calendar-years-pagination-pages';
                    var yearPageElement = element[0].querySelector('.' + yearPageClass);
                    var pages = yearPageElement.querySelectorAll('a');

                    var yearClass = '_720kb-datepicker-calendar-years-pagination';
                    var yearElement = element[0].querySelector('.' + yearClass);
                    var years = yearElement.querySelectorAll('a');
                    var hasAnyEnabled = false;

                    if(years.length == 0) return;
                    angular.forEach(years, function(year){
                        year = angular.element(year);
                        year.removeClass('_720kb-datepicker-active');
                        year.removeClass('_720kb-datepicker-disabled');
                        if(year.html() == $scope.year) {
                            hasAnyEnabled = true;
                            year.addClass('_720kb-datepicker-active');
                        }
                        if(!isSelectableMaxYear(year.html()) || !isSelectableMinYear(year.html())) {
                            year.addClass('_720kb-datepicker-disabled');
                        }
                    });

                    if(pages.length == 0 ) return;
                    var backwards = angular.element(pages[0]);
                    var forwards = angular.element(pages[1]);
                    var hiddenClass = '_720kb-datepicker-item-hidden';

                    if(!isNextYearBtnEnabled) {
                        forwards.addClass(hiddenClass);
                    }
                    else {
                        forwards.removeClass(hiddenClass);
                    }

                    if(!isPrevYearBtnEnabled) {
                        backwards.addClass(hiddenClass);
                    }
                    else {
                        backwards.removeClass(hiddenClass);
                    }

                });

            }

            function toogleYearsBtn() {
                var openedCalendar = '_720kb-datepicker-calendar-header-opened-pagination';
                var closedCalendar = '_720kb-datepicker-calendar-header-closed-pagination';
                var button = angular.element(element[0].querySelector("#selectYearBtn"));
                button.toggleClass(openedCalendar + ' ' + closedCalendar);
            }

			function isSelectableDate(date) {
				var hasDisabledDates = dateDisabledDates && dateDisabledDates.length > 0;
				if (hasDisabledDates) {
					for (let i = 0; i <= dateDisabledDates.length; i += 1) {
						var disabledDate = new Date(dateDisabledDates[i]).getTime();
						var selectedDate = date.getTime();
						if ( disabledDate === selectedDate) return false;
					}
				}
				return true;
			}

			function isSelectableMinDate(aDate) {
                if(!dateMinLimit) return true;
                return aDate.getTime() >= dateMinLimit.getTime();
        	}

			function isSelectableMaxDate(aDate) {
                if(!dateMaxLimit) return true;
                return aDate.getTime() <= dateMaxLimit.getTime();
			}

			function isSelectableMaxYear(year) {
                if(!dateMaxLimit) return true;
				return year <= dateMaxLimit.getFullYear();
        	}

			function isSelectableMinYear(year) {
                if(!dateMinLimit) return true;
            	return year >= dateMinLimit.getFullYear();
        	}

            function getCurrentYear() {
                return dateSelected.getFullYear();
            }

            function getCurrentMonthNumber() {
                return dateSelected.getMonth();
            }

            function getCurrentDay() {
                return dateSelected.getDate();
            }

            function getMaxDate() {
                var maxDate = $scope.dateMaxLimit;
                if (maxDate) {
                    var isDateType = maxDate instanceof Date;
                    if(!isDateType) maxDate = new Date(maxDate);
                    if(maxDate.toString() === 'Invalid Date') maxDate = undefined;
				}
                return maxDate;
            }

            function getMinDate() {
                var minDate = $scope.dateMinLimit;
                if (minDate) {
                    var isDateType = minDate instanceof Date;
                    if(!isDateType) minDate = new Date(minDate);
                    if(minDate.toString() === 'Invalid Date') minDate = undefined;
                }
                return minDate;
            }

            function getDateSet() {
                var dateSet = $scope.dateSet;
                if(dateSet) {
                    var isDateType = $scope.dateSet instanceof Date;
                    if(!isDateType) dateSet = new Date($scope.dateSet);
                    if(dateSet.toString() !== 'Invalid Date') {
                        //Offset time is in minutes
                        //We have to transform to milliseconds
                        // seconds = minutes * 60;
                        // milliseconds = seconds * 1000
                        var offsetHours = dateSet.getTimezoneOffset() * 60000;
                        return new Date(dateSet.getTime() + offsetHours);
                    }
                    return new Date();
                }
                return new Date();
            }

            function getDisabledDates() {
                var disabledDates = $scope.dateDisabledDates;
                var isDisabledDatesAnArray = disabledDates instanceof Array;
                if(disabledDates && isDisabledDatesAnArray) {
                    disabledDates = disabledDates.map(function(date) {
                        var isDateType = date instanceof Date;
                        if(!isDateType) date = new Date(date);
                        return date.toString() !== 'Invalid Date'? date : undefined;
                    });

                    disabledDates = disabledDates.filter(function(date) {
                        return date? true : false;
                    });

                    disabledDates = disabledDates.length === 0? undefined : disabledDates;
                }
                return disabledDates;
            }

		}
	}
})();

/*!
 videojs-social - v1.5.2 - 2015-09-15
 * Copyright (c) 2015 Brightcove; Licensed https://accounts.brightcove.com/en/terms-and-conditions
 */

/*! videojs-endscreen - v0.0.0 - 2014-10-13
 * Copyright (c) 2014 Brightcove
 * Modified by Hany alsamman for support videojs-5
 */
(function (window, videojs) {
    'use strict';

    /**
     * Initialize the plugin.
     * @param options (optional) {object} configuration for the plugin
     */
    var endscreen = function (options) {
        var player = this,
            hasAds = !!(player.ads),
            videoFinished = false,
            adStarted = false,
            adFinished = false;

        /**
         * videojs-ima3 appears to be firing an `adend` event at the start of the actual video when the ad
         * is a postroll. We can account for it by checking if start was called and then if end was called.
         * If a postroll is being run, it will bind displaying the Overlay to `adend` instead of `ended`.
         */
        if (hasAds) {
            player.on('adstart', function () {
                adStarted = true;
                adFinished = false;
            });

            player.on('adend', function () {
                if (adStarted) {
                    adFinished = true;
                }
            });
        }

        player.on('ended', function () {
            if (!videoFinished && (!hasAds || (adStarted && adFinished) || (!adStarted && !adFinished))) {
                videoFinished = true;
            }

            if (videoFinished && hasAds && !adFinished) {
                player.on('adend', function () {
                    player.trigger('endscreen');
                });
            } else if (videoFinished) {
                player.trigger('endscreen');
            }
        });
    };

    // register the plugin
    videojs.plugin('endscreen', endscreen);
})(window, window.videojs);

/*! videojs-social - v0.0.0 - 2014-5-1
 * Copyright (c) 2014 Brightcove */
(function (window, videojs) {
    'use strict';

    // Allocate all variables to be used
    var defaults = {
            title: '',
            description: '',
            url: '',
            deeplinking: false,
            displayAfterVideo: false,
            offset: '00:00:00',
            services: {
                facebook: true,
                google: true,
                twitter: true,
                tumblr: true,
                pinterest: true,
                linkedin: true
            }
        },
        addEvent = function (el, type, callback) {
            if (el.addEventListener) {
                return el.addEventListener(type, callback, false);
            }

            // IE8 is onclick, not click
            if (!el.addEventListener && type === 'click') {
                type = 'onclick';
            }
            return el.attachEvent(type, callback);
        },

        removeEvent = function (el, type, callback) {
            if (el.removeEventListener) {
                return el.removeEventListener(type, callback, false);
            }
            if (!el.removeEventListener && type === 'click') {
                type = 'onclick';
            }
            return el.detachEvent(type, callback);
        },

        social;

    var handleEvent = function (e) {
        e.preventDefault();
        window.open(
            this.href,
            '_blank',
            'width=600, height=400, top=100, left=100, titlebar=yes, modal=yes, resizable=yes, toolbar=no, status=1, location=no, menubar=no, centerscreen=yes'
        );
    };

    /**
     * Initialize the plugin.
     * @param options (optional) {object} configuration for the plugin
     */
    social = function (options) {

        var settings,
            player = this;

        // Merge options with the buttons defaults
        settings = videojs.mergeOptions(defaults, options);

        // Make sure that at least one social service is specified
        //  If not, then do not add the social button
        if (!(settings &&
            settings.services &&
            (settings.services.facebook ||
            settings.services.twitter ||
            settings.services.google ||
            settings.services.tumblr ||
            settings.services.pinterest ||
            settings.services.linkedin))) {
            throw new Error('videojs-social requires at least one service to be enabled');
        }

        // If we are being re-initialized then remove the old stuff
        if (player.controlBar.socialButton) {
            player.controlBar.removeChild(player.controlBar.socialButton);
            delete player.controlBar.socialButton;

            if (player.socialOverlay) {
                player.removeChild(player.socialOverlay);
                delete player.socialOverlay;
            }
        }

        // Add social button to player
        player.controlBar.socialButton = player.controlBar.addChild('socialButton', settings);
        player.socialOverlay = player.addChild('socialOverlay', settings);

        // Add tabindex
        player.controlBar.socialButton.el().setAttribute('tabindex', '0');

        if (settings.displayAfterVideo) {
            player.endscreen();
            player.on('endscreen', function () {
                player.socialOverlay.enableRestartButton();
                player.socialOverlay.show();
            });
        }
    };

    /*
     * The "Share" control bar button
     */
    videojs.SocialButton = videojs.extend(videojs.getComponent('Button'), {
        init: function (player, options) {
            videojs.getComponent('Button').call(this, player, options);

            // Bind touchstart for mobile browsers and prevent default
            this.on('touchstart', function (e) {
                player.socialOverlay.update();
                player.socialOverlay.disableRestartButton();
                player.socialOverlay.show();
                e.preventDefault();
            });

            // Bind click event for desktop browsers
            this.on('click', function () {
                player.socialOverlay.update();
                player.socialOverlay.disableRestartButton();
                player.socialOverlay.show();
            });

        }
    });

    videojs.SocialButton.prototype.createEl = function () {
        return videojs.getComponent('Button').prototype.createEl.call(this, 'div', {
            className: 'vjs-share-control vjs-control',
            role: 'button',
            'aria-live': 'polite',
            innerHTML: '<div class="vjs-control-content"><span class="vjs-control-text">Share</span></div>'
        });
    };

    /*
     * The overlay panel that is toggled when the SocialButton is clicked
     */
    videojs.SocialOverlay = videojs.extend(videojs.getComponent('Component'), {
        init: function (player, options) {

            var embedCode,
                start,
                directLinkTextBox,
                embedCodeTextBox,
                offsetTextBox,
                servicesHtml,
                service,
                restartButton;

            // If we are being recreated, then remove our old self
            if (player.socialOverlay) {
                player.removeChild(player.socialOverlay);
            }

            videojs.getComponent('Component').call(this, player, options);

            // set the direct link and embed code
            this.el().querySelector('.vjs-social-embed-container input').setAttribute('value', this.getEmbedCode());
            this.el().querySelector('.vjs-social-direct-link-container input').setAttribute('value', this._getUrlWithTime());

            // Setup the Restart Button
            restartButton = this.el().querySelector('.vjs-restart');
            addEvent(restartButton, 'click', videojs.bind(this, this._restartPlayer));
            addEvent(restartButton, 'activate', videojs.bind(this, this._restartPlayer));

            // Bind service buttons using options
            this._bindServiceButtons(options.services);

            // Hide offset if deeplinking is disabled
            if (!options.deeplinking) {
                start = this.el().querySelector('.vjs-social-start');
                start.className += ' vjs-hidden ';
            }

            // Hide Embed code if disabled
            if (options.removeEmbed && options.removeEmbed === true) {
                this.el().querySelector('.vjs-social-embed-container').className += ' vjs-hidden ';
            }

            // Hide Direct Link
            if (options.removeDirect && options.removeDirect === true) {
                this.el().querySelector('.vjs-social-direct-link-container').className += ' vjs-hidden ';
            }

            // Add event to select the direct link when clicked
            directLinkTextBox = this.el().querySelector('.direct-link-textbox');
            addEvent(directLinkTextBox, 'click', function () {
                this.select();
            });

            // Add event to select the embed code when clicked
            embedCodeTextBox = this.el().querySelector('.embed-code-textbox');
            addEvent(embedCodeTextBox, 'click', function () {
                this.select();
            });

            this.offsetTextBox = this.el().querySelector('.start-offset-textbox');

            // Bind changed event to the start offset
            //  which will update the direct and embed links on changes and show it's current state
            addEvent(this.offsetTextBox, 'change', videojs.bind(this, this.update));

            // Bind the click event of the close button to hide the social overlay
            this.closeButton = this.el().querySelector('.vjs-social-cancel');

            // Catch escape key and hide dialog when pressed
            addEvent(this.el(), 'keydown', function (event) {
                if (player.socialOverlay.el().display !== 'none' && event.keyCode === 27) {
                    // Hide the overlay, return focus to social button
                    player.socialOverlay.hide();
                }
            }, true);


            this.on('click', function (event) {
                // if we clicked in the close button, we should close the overlay,
                // this is specifically added to enable the closeButton in IE8
                if (event.target === this.closeButton) {
                    player.socialOverlay.hide();
                }
            });
        },

        update: function () {
            var embedCodeTextBox = this.el().querySelector('.embed-code-textbox'),
                directLinkTextBox;
            var options = this.options_;

            if (/^\s*(0*[1-5]*\d|0*[1-5]*\d:[0-5]\d|\d+:[0-5]\d:[0-5]\d)\s*$/.test(this.offsetTextBox.value)) {

                directLinkTextBox = this.el().querySelector('.direct-link-textbox');

                // update the validation state
                this.offsetTextBox.className = this.offsetTextBox.className.replace(/(^|\s)vjs-invalid/, '');

                // Compute the new direct link
                directLinkTextBox.value = this._getUrlWithTime();
            } else {
                this.offsetTextBox.className += ' vjs-invalid';
            }

            // Compute the new embed code
            embedCodeTextBox.setAttribute('value', this.getEmbedCode());

            // rebind buttons
            this._bindServiceButtons(options.services);

        },

        enableRestartButton: function () {
            var restartButton = this.el().querySelector('.vjs-restart');
            restartButton.className = restartButton.className.replace(/\bvjs\-hidden\b/, '');
        },

        disableRestartButton: function () {
            var restartButton = this.el().querySelector('.vjs-restart');
            if (!/\bvjs-hidden\b/.test(restartButton.className)) {
                restartButton.className += ' vjs-hidden';
            }
        },

        hide: function () {
            videojs.getComponent('Component').prototype.hide.call(this);
            if (this.previouslyPlaying) {
                this.player().play();
            }
            // Set focus back to the social button for accessibility
            this.player().controlBar.socialButton.el().focus();
        },

        show: function () {
            videojs.getComponent('Component').prototype.show.call(this);
            if (!this.player().paused()) {
                this.previouslyPlaying = true;
                this.player().pause();
            }
            // Set focus to first social service link
            this.el().querySelector('.vjs-share-options a:first-child').focus();
        }
    });

    /*
     * Iterates through the list of selected social services and binds the href to the anchor
     */
    videojs.SocialOverlay.prototype._bindServiceButtons = function (serviceButtons) {

        var player = this.player(),
            options = this.options_;

        var service,
            encodedUrl,
            encodedTitle,
            encodedDescription,
            encodedPoster,
            posterUrl = player.poster();

        // Encode share url properties
        encodedUrl = encodeURIComponent(this._getUrl());
        encodedTitle = encodeURIComponent(this._getTitle());
        encodedDescription = encodeURIComponent(options.description);

        // if there is a poster image, encode the url
        if (posterUrl) {
            encodedPoster = encodeURIComponent(posterUrl);
        }

        // Iterate through supported services and bind buttons
        for (service in serviceButtons) {
            if (serviceButtons[service] === true) {
                this._bindServiceButton(service, encodedUrl, encodedTitle, encodedDescription, encodedPoster, posterUrl);
            }
        }
    };

    /*
     *  Binds the correct href url to the matching service button
     */
    videojs.SocialOverlay.prototype._bindServiceButton = function (service, encodedUrl, encodedTitle, encodedDescription, encodedPoster, posterUrl) {

        // Switch on the requested service
        switch (service) {
            // Facebook
            case 'facebook':
                // Bind Facebook button
                this._bindSocialButton(
                    '.vjs-share-facebook',
                    'https://www.facebook.com/sharer/sharer.php?u={URL}&title={TITLE}'.replace('{URL}', encodedUrl).replace('{TITLE}', encodedTitle)
                );
                break;

            // Google+
            case 'google':
                // Bind Google+ button
                this._bindSocialButton(
                    '.vjs-share-gplus',
                    'https://plus.google.com/share?url={URL}'.replace('{URL}', encodedUrl)
                );
                break;

            // Twitter
            case 'twitter':
                // Bind Twitter button
                this._bindSocialButton(
                    '.vjs-share-twitter',
                    'https://twitter.com/intent/tweet?original_referer=https%3A%2F%2Fabout.twitter.com%2Fresources%2Fbuttons&text={TITLE}&tw_p=tweetbutton&url={URL}'.replace('{URL}', encodedUrl).replace('{TITLE}', encodedTitle)
                );
                break;

            // Tumblr
            case 'tumblr':
                // Bind Tumblr button
                this._bindSocialButton(
                    '.vjs-share-tumblr',
                    'http://www.tumblr.com/share?v=3&u={URL}&t={TITLE}'.replace('{URL}', encodedUrl).replace('{TITLE}', encodedTitle)
                );
                break;

            // Pinterest
            case 'pinterest':
                // Bind Pinterest button if there is a poster image available otherwise the link will not work
                this._bindSocialButton(
                    '.vjs-share-pinterest',
                    'https://pinterest.com/pin/create/button/?url={URL}{POSTER}&description={TITLE}&is_video=true'.replace('{URL}', encodedUrl).replace('{TITLE}', encodedTitle).replace('{POSTER}', encodedPoster ? '&media=' + encodedPoster : '')
                );
                break;

            // LinkedIn
            case 'linkedin':
                // Bind LinkedIn button
                this._bindSocialButton(
                    '.vjs-share-linkedin',
                    'https://www.linkedin.com/shareArticle?mini=true&url={URL}&title={TITLE}&summary={DESCRIPTION}&source=Classic'.replace('{URL}', encodedUrl).replace('{TITLE}', encodedTitle).replace('{DESCRIPTION}', encodedDescription)
                );
                break;

            default:
                throw new Error('An unsupported social service was specified.');
        }
    };

    videojs.SocialOverlay.prototype.createEl = function () {
        var player = this.player(),
            options = this.options_;

        return videojs.getComponent('Component').prototype.createEl.call(this, 'div', {
            className: 'vjs-social-overlay vjs-hidden',
            'aria-role': 'dialog',
            'aria-label': player.localize('Sharing Dialog'),
            'tabindex': -1,
            innerHTML: '<div class="vjs-social-cancel" role="button">' +
            '<div class="vjs-control-text" aria-label="' + player.localize('Close button') + '">' + player.localize('Close') + '</div>' +
            '</div>' +
            '<form>' +
            '<legend>' + player.localize('Share Video') + ': ' + this._getTitle() + '</legend>' +
            '<label>' + player.localize('Share via') + ':' +
            '<ul class="vjs-share-options">' +
            this._addSocialButtons(options.services) +
            '</ul>' +
            '</label>' +
            '<div class="vjs-social-link-options">' +
            '<label class="vjs-social-start" aria-label="' + player.localize('Start From') + '">' + player.localize('Start From') + ': <input class="start-offset-textbox" type="text" tabindex="9" title="The offset must be specified using the following pattern: hh:mm:ss" placeholder="hh:mm:ss" maxlength="10" value="' + options.offset + '" /></label>' +
            '<div class="vjs-social-direct-link-container">' +
            '<label class="vjs-social-link" aria-label="Read Only: Direct Link To Content">' + player.localize('Direct Link') + ': <input class="direct-link-textbox" type="text" tabindex="8" readonly="true" /></label>' +
            '</div>' +
            '</div>' +
            '<div class="vjs-social-embed-container">' +
            '<label arial-label="Read Only: Embed Code">' + player.localize('Embed Code') + ': <input class="embed-code-textbox" type="text" tabindex="10" readonly="true" /></label>' +
            '</div>' +
            '</form>' +
            '<button tabindex="0" class="vjs-restart vjs-hidden">' +
            '<div class="vjs-control-content"><span class="vjs-control-text">' + player.localize('Restart') + '</span></div>' +
            '</button>'
        });
    };

    /*
     * Computes the new embed code
     */
    videojs.SocialOverlay.prototype.getEmbedCode = function () {
        // Declare variables
        var offset, offsetTextBox, playerOptions, embedCode, urlTemplate, player, options;

        player = this.player();
        options = this.options_;

        // Assign converted initial options offset value
        offset = options.deeplinking ? this._convertOffset(options.offset) : null;
        // If we can't find the offset control we should use the options value
        offsetTextBox = player.el().querySelector('.start-offset-textbox');
        if (offsetTextBox && options.deeplinking) {
            offset = this._convertOffset(offsetTextBox.value);
        }
        // Get the player options so we can retrieve the account_id, player_id, and embed_id
        playerOptions = player.options_;

        // encode the URL for security
        if (playerOptions['data-embed-url']) {
            playerOptions['data-embed-url'] = encodeURI(playerOptions['data-embed-url']);
        }

        // Fallback Url Template
        urlTemplate = '//players.brightcove.net/{{account_id}}/{{player_id}}_{{embed_id}}/index.html{{video_id}}';

        // If in iframe use its URL
        // jshint -W116
        if (window.parent != window) {
            urlTemplate = window.location.href;
        }
        // jshint +W116

        // Embed code
        if (options.embedCode) {
            embedCode = options.embedCode;
        } else {
            embedCode = '<iframe src=\'' + urlTemplate + '{{offset}}\' allowfullscreen frameborder=0></iframe>';
        }

        // Construct the embed code snippet. Replace values with known template params.
        return embedCode
            .replace('{{account_id}}', playerOptions['data-account'])
            .replace('{{player_id}}', playerOptions['data-player'])
            .replace('{{embed_id}}', playerOptions['data-embed'])
            .replace('{{video_id}}', (player.mediainfo && player.mediainfo.id) ? '?videoId=' + player.mediainfo.id : '')
            .replace('{{offset}}', offset ? '#t=' + offset : '');
    };

    /*
     * Determines the URL to be dispayed in the share dialog
     */
    videojs.SocialOverlay.prototype._getUrl = function () {
        var url,
            options = this.options_;

        // Determine the custom base url
        // In IE8, window.parent doesn't === window, but it does == equal it.
        // jshint -W116
        if (options.url) {
            url = options.url;
        } else if (window.parent != window) {
            url = document.referrer;
        } else {
            url = window.location.href;
        }
        // jshint +W116

        return url;
    };

    videojs.SocialOverlay.prototype._getUrlWithTime = function () {
        var options = this.options_,
            url = this._getUrl(),
            offset;

        // Get the start offset textbox (Only include offset if deeplinking is enabled)
        if (options.deeplinking) {
            offset = this._convertOffset(this.el().querySelector('.start-offset-textbox').value);
        }

        // Append the offset if available
        if (offset) {
            url = url + '#t=' + offset;
        }

        return url;
    };

    /*
     * Updates the title based on the media date or the custom options setting
     */
    videojs.SocialOverlay.prototype._getTitle = function () {
        var playerOptions,
            options = this.options_,
            player = this.player(),
            title = options.title;

        // If there's no title try and find one in the options
        if (!title) {

            // Get player options
            playerOptions = player.options_;

            // Search the player options data media for a title
            if (playerOptions['data-media'] && playerOptions['data-media'].title) {
                title = playerOptions['data-media'].title;
            }
        }

        return title || '';
    };
    /*
     * Converts an offset from hh:mm:ss to the YouTube format of 1h27m14s
     */
    videojs.SocialOverlay.prototype._convertOffset = function (offset) {

        var segments,
            seconds = 0,
            multiples = [1, 60, 3600],
            ret = '',
            i,
            s;

        if (offset) {
            segments = offset.split(':');
            if (segments.length >= 1 && segments.length <= 3) {
                // Parse each segment into an integer to remove leading zeros and other dentritis
                for (i = 0; i < segments.length; ++i) {
                    s = parseInt(segments[i], 10) * multiples[segments.length - 1 - i];
                    if (isNaN(s)) {
                        return '';
                    }
                    seconds += s;
                }
                ret = '';
                if (seconds >= 3600 && Math.floor(seconds / 3600) !== 0) {
                    ret = Math.floor(seconds / 3600) + 'h';
                    seconds = seconds % 3600;
                }

                if (seconds >= 60 && Math.floor(seconds / 60) !== 0) {
                    ret += Math.floor(seconds / 60) + 'm';
                    seconds = seconds % 60;
                }

                if (seconds > 0) {
                    ret += seconds + 's';
                }

                return ret;

            }
        }

        return '';
    };

    /*
     * Unobtrusively attaches events to a button
     */
    videojs.SocialOverlay.prototype._bindSocialButton = function (elementSelector, url) {

        var elt, handler;

        // Find the element, if not available, that means if was not selected for sharing
        elt = this.el().querySelector(elementSelector);

        // If element found then bind events, if not found, it isn't a supported service
        if (elt) {
            elt.href = url;
            // Remove previous event if exists
            removeEvent(elt, 'touchend', handleEvent);

            // Bind touchstart for mobile browsers and prevent defaults
            addEvent(elt, 'touchend', handleEvent);

            // Remove previous event if exists
            removeEvent(elt, 'click', handleEvent);

            // Bind click event
            addEvent(elt, 'click', handleEvent);
        }
    };

    /*
     * Iterates through the list of selected social services and creates their html
     */
    videojs.SocialOverlay.prototype._addSocialButtons = function (services) {

        var servicesHtml, service;

        // Iterate through supported services and construct html
        servicesHtml = '';
        for (service in services) {
            if (services[service] === true) {
                servicesHtml += this._addServiceButton(service);
            }
        }

        // return html
        return servicesHtml;
    };

    /*
     * addServiceButton - Creates a link that appears as a social sharing button.
     */
    videojs.SocialOverlay.prototype._addServiceButton = function (service) {

        var link = '';

        // Switch on the requested service
        switch (service) {
            // Facebook
            case 'facebook':
                link = '<li><a class="vjs-share-facebook" aria-role="link" aria-label="Share on Facebook" tabindex="1" title="Facebook" target="_blank"><span class="vjs-control-text">Facebook</span></a></li>';
                break;

            // Google+
            case 'google':
                link = '<li><a class="vjs-share-gplus" aria-role="link" aria-label="Share on Google Plus" tabindex="2" title="Google+" target="_blank"><span class="vjs-control-text">Google+</span></a></li>';
                break;

            // Twitter
            case 'twitter':
                link = '<li><a class="vjs-share-twitter" aria-role="link" aria-label="Share on Twitter" tabindex="3" title="Twitter" target="_blank"><span class="vjs-control-text">Twitter</span></a></li>';
                break;

            // Tumblr
            case 'tumblr':
                link = '<li><a class="vjs-share-tumblr" aria-role="link" aria-label="Share on Tumblr" tabindex="4" title="Tumblr" target="_blank"><span class="vjs-control-text">tumblr</span></a></li>';
                break;

            // Pinterest
            case 'pinterest':
                link = '<li><a class="vjs-share-pinterest" aria-role="link" aria-label="Share on Pinterest" tabindex="5" title="Pinterest" target="_blank"><span class="vjs-control-text">Pinterest</span></a></li>';
                break;

            // LinkedIn
            case 'linkedin':
                link = '<li><a class="vjs-share-linkedin" aria-role="link" aria-label="Share on LinkedIn" tabindex="6" title="LinkedIn" target="_blank"><span class="vjs-control-text">LinkedIn</span></a></li>';
                break;

            default:
                throw new Error('An unsupported social service was specified.');
        }

        // Return the constructed link
        return link;
    };

    videojs.SocialOverlay.prototype._restartPlayer = function () {
        var player = this.player();
        player.socialOverlay.hide();
        player.currentTime(0);
        player.play();
    };

    // register the plugin
    videojs.plugin('social', social);

    // End the closure
})(window, window.videojs);

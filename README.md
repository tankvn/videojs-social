# videojs-social
The social media plugin enables users to share a video through Facebook, Google+, Twitter, Tumblr, Pinterest and LinkedIn.

![](http://docs.brightcove.com/en/perform/brightcove-player/assets/social-media-icon.png)

### Clicking on this icon displays the social sharing screen, as shown here.
![](http://docs.brightcove.com/en/perform/brightcove-player/assets/social-media-selection.png)

## Social Plugin For VideoJs 4
http://docs.brightcove.com/en/perform/brightcove-player/guides/social-media-plugin.html

## Working Demo
https://solutions.brightcove.com/bcls/brightcove-player/social-plugin/social-media.html

## Properties

For plugins in general, the options object is used to pass data to the plugin to customize initialization. In this case, you can use the following properties in this object:
title

    Type: string
    This is a custom title that will appear when your video is shared.

description

    Type: string
    This is a custom description that will be used by the social services which support it.

url

    Type: string
    This is the URL that points to your custom web page which has your video and the meta tags for sharing. Refer to the meta tags section for details on how to add the social media metadata to your player page.

embedCode

    Type: string
    This is the Brightcove player iframe embed code for sharing the video. This allows you to completely override the contents of the Embed Code field located in the sharing dialog.
    Social Media Embed Code
    You can get the value of this property by using the getEmbedCode() method.

displayAfterVideo

    Type: boolean
    Default: false
    Causes the social screen to automatically show on an ended event

deeplinking

    Type: boolean
    Default: false

    This enables/disables deep linking for the shared video. This feature allows a user to start viewing a video from a specific offset. For more details, view the Deep Linking document.

    Note: The deep linking feature currently only works with Twitter.

offset

    Type: string
    Format: 00h00m00s
    This is used with the deeplinking property and defines when to start playing the video. To offset 1 minute and 5 seconds, you would write: 00h01m05s

services

Include all service properties in this object. To enable or disable support for a service, set the property value to true or false instead of removing them.

    facebook
        Type: boolean
        Default: true
        This enables the Facebook sharing icon.
    google
        Type: boolean
        Default: true
        This enables the Google+ sharing icon.
    twitter
        Type: boolean
        Default: true
        This enables the Twitter sharing icon.
    tumblr
        Type: boolean
        Default: true
        This enables the Tumblr sharing icon.
    pinterest
        Type: boolean
        Default: true
        This enables the Pinterest sharing icon.
    linkedin
        Type: boolean
        Default: true
        This enables the LinkedIn sharing icon

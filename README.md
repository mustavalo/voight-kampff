
# VOIGHT-KAMPFF<br>An experimentation in music visualization.

_Created by KAPITAN! / Lauri-Matti Parppei_<br>_Requires Paper.js and Howler.js libraries._

Live version: http://www.mustavalo.com/vk/

__Please note:__ I am not a coder and don't have much experience with writing any code whatsoever. All of what you see here was learned from scratch and built from the ground up after numerous hours of errors and mistakes, so please excuse all the bad programming. The strangest parts I've tried to explain, but it's still sort of a mess. Dread at your own risk!

The core of all this is the rendering queue - the first thing you perhaps want to do is to clean out all of the music video parts.

Most of this is inside PaperScope and I've kept everything in a single JavaScript file of 2500 lines. And to be honest, I didn't really get it working split into multiple script files, because of the scope problems. A more experienced coder could squeeze everything into a single, clean class and just extend it.

I've edited out some PHP scripts from this open source version to get it working locally without a HTTP server, but there might be few remains of AJAX calls etc.

Hopefully this will inspire some better and fancier things and help those trying to create interactive experiences for the web.


__Future considerations__
* Clearing the music video concept out of this and making it more of a procedural animation tool for the web
* MIDI controls? (http://www.keithmcmillen.com/blog/making-music-in-the-browser-web-midi-api/)
* Node.js support?

The whole thing is released under the MIT License. Thanks to numerous people at Stack Overflow and the creators of Paper.js.

Good luck.


__Lauri-Matti Parppei__<br>
Graphic designer and filmmaker<br>
www.kapitan.fi

# Awesome Object Capabilities and Capability-based Security

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

Capability-based security enables the concise composition of powerful
[patterns](https://github.com/dckc/awesome-ocap/wiki) of cooperation without vulnerability. [What Are Capabilities?](http://habitatchronicles.com/2017/05/what-are-capabilities/) explains in detail.

## Contents

 - [Applications and Services](#app-svc)
 - [Libraries and Frameworks](#lib)
 - [Programming Languages](#lang)
 - [Operating Systems](#os)
 - [CPUs](#cpu)
 - [Presentations, Talks, Slides, and Videos](#talk)
 - [Articles](#article)
   - [Peer-reviewed Articles](#lit)

<a name="app-svc"></a>
## Applications and Services

  - [Sandstorm](https://sandstorm.io/) is a self-hosted web
    productivity suite and [App Market](https://apps.sandstorm.io/)
    with WordPress, Rocket.Chat, IPython Notebook and many more.
    [Sandstorm's Capability-based Security][scap] protects you and
    your data against application bugs.
    - 2020-02-22: [Announcing the release of vagrant\-spk 1\.0](https://sandstorm.io/news/2020-02-22-announcing-vagrant-spk-1.0)
    - 2020-02-03: [Reviving Sandstorm \- Sandstorm Blog](https://sandstorm.io/news/2020-02-03-reviving-sandstorm)
    - 2017-03-02: [connecting to external HTTP APIs via the Powerbox](https://github.com/sandstorm-io/sandstorm/pull/2870)
      and related powerbox enhancements  
      v0.200 (2017-01-28), v0.203
    - 2015-02-06: [One click to try an open source web application][1502] 
  - [Tahoe-LAFS](https://tahoe-lafs.org/) is a highly available
    decentralized cloud storage system. Even if some of the servers
    fail or are taken over by an attacker, the entire file store
    continues to function correctly, preserving your privacy and
    security.
    - 2017-01-18 v1.12.1 released

[scap]: https://sandstorm.io/how-it-works#capabilities
[1407]: https://sandstorm.io/news/2014-07-21-open-source-web-apps-require-federated-hosting
[1502]: https://sandstorm.io/news/2015-02-06-app-demo

<a name="lib"></a>
## Libraries and Frameworks

  - JavaScript
    - [SES](https://www.npmjs.com/package/ses) is "hardened JavaScript. SES stands for fearless cooperation. ... SES safely executes third-party JavaScript 'strict' mode programs in compartments that have no excess authority in their global scope. SES runs atop an ES6-compliant platform, enabling safe interaction of mutually-suspicious code, using object-capability-style programming. See https://github.com/Agoric/Jessie to see how SES fits into the various flavors of confined JavaScript execution. And visit https://ses-demo.agoric.app/demos/ for a demo. "
      - 2021-09-01: SES-0.14.3 `6190052`
      - 2020-03-31: SES-0.7.6 `9385d44`
      - 2018-10-15: [SF Cryptocurrency Devs: Agoric \- Programming Secure Smart Contracts](https://www.youtube.com/watch?v=YXUqfgdDbr8)
      - 2018-07-28: [Agoric Releases SES: Secure JavaScript](https://agoric.com/agoric-releases-ses/)  f4d3d5a
      - [Distributed Resilient Secure ECMAScript (Dr. SES)](https://tvcutsem.github.io/drses) ESOP 2013
    - [Caja](https://developers.google.com/caja/) is a compiler for making
      third-party HTML, CSS and JavaScript safe for embedding.
      Caja safely supports mashups and extends JSON with code.
      - Apr 2, 2018: release v6013 964609d
      - 12 Jan 2017: release v6011 74ba0da
    - [Capper](https://github.com/marcsAtSkyhunter/Capper) is a web
      application server built on Node.js/Express using
      the [Waterken](http://waterken.sourceforge.net/) webkey protocol
      for object capability security.
      - [fun with Capper and OFX financial transaction fetching](https://groups.google.com/forum/#!topic/captalk/vw1yOecgU10) Jan 2016 to cap-talk

  - C++
      - [Cap’n Proto](https://capnproto.org/) is a high performance
        serialization and RPC protocol with distributed and persistent
        capabilities and promise pipelining. Bindings to python,
        JavaScript (in node.js), Go, Rust, etc. are available
        - 2020-04-23: [Cap'n Proto: Cap'n Proto 0\.8: Streaming flow control, HTTP\-over\-RPC, fibers, etc\.](https://capnproto.org/news/2020-04-23-capnproto-0.8.html)
        - 2014-12-15: [Cap'n Proto 0.5, and how it is central to Sandstorm][1412] by Kenton Varda
  - Scheme (racket)
      - [Spritely](https://dustycloud.org/blog/spritely/)
        - 2020-05-13 [Spritely's NLNet grant: Interface Discovery for Distributed Systems \-\- DustyCloud Brainstorms](https://dustycloud.org/blog/spritely-nlnet-grant/)
      - [COAST](http://isr.uci.edu/projects/coast/) is COmputAtional State
        Transfer, An Architectural Style for Secure Decentralized
        Systems. The sole means of interaction among computations is the
        asynchronous messaging. Motile is a single-assignment, functional,
        and mobile code language based on Scheme
        - Gorlick, Michael M., and Richard N. Taylor.  
        [Motile: Reflecting an Architectural Style in a Mobile Code Language.](http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.310.4496) (2013).
        - Baquero, Alegria.  
        [COASTmed: software architectures for delivering customizable, policy-based differential web services.](http://dl.acm.org/citation.cfm?id=2591083) Companion Proceedings of the 36th International Conference on Software Engineering. ACM, 2014.

      - [Shill](http://shill-lang.org): Shill is a shell scripting
        language designed to make it easy to follow the Principle of Least
        Privilege. It runs on FreeBSD and is developed in Racket.
        - [Shill: A Secure Shell Scripting Language][shill-osdi]. Scott
          Moore, Christos Dimoulas, Dan King, and Stephen Chong. 11th
          USENIX Symposium on Operating Systems Design and Implementation
          (OSDI), October 2014.

[shill-osdi]: http://shill.seas.harvard.edu/shill-osdi-2014.pdf
  - Scala
      - [ocaps](https://wsargent.github.io/ocaps) is a library for working with object capabilities in Scala.
         * Revoker / Revocable classes for revoking capabilities.
         * Brand for sealing and unsealing capabilities
         * PermeableMembrane for revocation as an effect.
         * Macros for composition, attenuation, revocable and modulating capabilities.
      - Comes with a [guide to capabilities](https://wsargent.github.io/ocaps/guide/index.html)
         - 2018-06-20 v0.1.0 released
         - 2018-09-22 [Presentation at Scaladays](https://slideslive.com/38908776/security-with-scala-refined-types-and-object-capabilities?subdomain=false)
  - rust
    - [cap-std](https://github.com/sunfishcode/cap-std) Capability-oriented version of the Rust standard library\
      0.4.0 Sep 24, 2020
    - [Using Capabilities to Design Safer, More Expressive APIs](http://zsck.co/writing/capability-based-apis.html)
      Zack Mullaly Jan 19, 2018

  - [Network protocols, sans I/O](http://sans-io.readthedocs.io/) supports
    object capability discipline by letting the caller handle network access.

[1412]: https://sandstorm.io/news/2014-12-15-capnproto-0.5

<a name="lang"></a>
## Programming Languages

  - [Pony](http://www.ponylang.org/) is an open-source,
    object-oriented, actor-model, capabilities-secure, high
    performance programming language.
    - March 22, 2019: 0.28.0 Released 0e67d08
    - bootstrapped using LLVM on x86 and ARM; packaged for linux and Mac OS X
    - docker images: [ponylang](https://hub.docker.com/u/ponylang/)
    - [Fully concurrent garbage collection of actors on many-core machines][237]  
      S. Clebsch and S. Drossopoulou  
      OOPSLA 2013

  - [Monte](http://www.monte-language.org/) is a nascent dynamic
    programming language reminiscent of Python and E. It is based upon
    _The Principle of Least Authority_ (POLA), which governs
    interactions between objects, and a _capability-based object
    model_, which grants certain essential safety guarantees to all
    objects.
    - bootstrapped from rpython (pypy toolchain) and libuv and
    libsodium using (primarily) the nix build system.
    - Docker images: [montelang](https://hub.docker.com/r/montelang/)
    - 2017-03: [Monte: A Spiritual Successor to E](https://www.youtube.com/watch?v=FJnck8bgmXg&list=PLCq8mSCP664TUdgHl1cD5sDiAmrDoio2p) presented by Corbin Simpson at OCAP 2017

<a name="os"></a>
## Operating Systems

  - [genode](https://genode.org/) is a novel OS architecture that is
    able to master the complexity of code and policy -- the most
    fundamental security problem shared by modern general-purpose
    operating systems -- by applying a strict organizational structure
    to all software components including device drivers, system
    services, and applications.
    
    - 2021-08 [Genode OS Framework release 21.08](https://genode.org/news/genode-os-framework-release-21.08) "revamped GPU support as well as new drivers for the Pinephone and MNT-Reform"
    - 2020-05-28 [Genode OS Framework 20.05](https://genode.org/documentation/release-notes/20.05) with [Capability-based security using seccomp on Linux](https://genode.org/documentation/release-notes/20.05#Capability-based_security_using_seccomp_on_Linux), ...
    - 2020-05-07: [MNT Reform \- The Campaign is Live](https://www.crowdsupply.com/mnt/reform/updates/the-campaign-is-live)
      > we’re collaborating with Genode Labs to ship Genode for Reform.
    - 2020-03-10: [Sculpt OS release 20.02](https://genode.org/news/sculpt-os-release-20.02)
      Version 20.02 of the Sculpt operating system revisits the administrative user interface for a more intuitive and logical user experience.
    - 2020-02-28: [Genode OS Framework release 20.02](https://genode.org/news/genode-os-framework-release-20.02)
      With version 20.02, Genode makes Sculpt OS fit for running on i.MX 64-bit ARM hardware, optimizes the performance throughout the entire software stack, and takes the next evolutionary step of the user-facing side of Sculpt OS.
    - 2020-01-20: [Road Map for 2020](https://genode.org/about/road-map)
    - 2019-05: [Genode OS Framework Foundations](https://genode.org/documentation/genode-foundations/19.05/index.html) book ([PDF](https://genode.org/documentation/genode-foundations-19-05.pdf))
    - [Genode OS Framework release 17.11][1711] Nov 30, 2017
      > Most of the many improvements of version 17.11 are geared
      > towards the practical use of Genode as day-to-day OS. They
      > include a reworked GUI stack, new user-input features, and the
      > packaging of many components. The new version also revises the
      > boot concept on x86, updates the seL4 kernel, and enhances
      > Genode's user-level networking facilities.

[1608]: https://genode.org/news/genode-os-framework-release-16.08
[1708]: https://genode.org/documentation/release-notes/17.08
[1711]: https://genode.org/news/genode-os-framework-release-17.11

  - [Fuchsia](https://fuchsia.googlesource.com/docs/+/HEAD/getting_started.md) is
    a real-time operating system in development by Google since
    Aug 2016. It's based on a
    microkernel,
    [Magenta](https://fuchsia.googlesource.com/magenta/+/master/README.md),
    with a capability security model.
    - 2021-06 [cr0 blog: A few thoughts on Fuchsia security](https://blog.cr0.org/2021/06/a-few-thoughts-on-fuchsia-security.html) Julien Tinnes. _Sandboxing is trivial. In fact a new process with access to no capabilities_
    - 2020-06-09 [Playing Around With The Fuchsia Operating System](https://blog.quarkslab.com/playing-around-with-the-fuchsia-operating-system.html) - [Quarkslab's blog](https://blog.quarkslab.com/index.html)
    - 2017-05-08 [Google’s “Fuchsia” smartphone OS dumps Linux, has a wild new UI](https://arstechnica.com/gadgets/2017/05/googles-fuchsia-smartphone-os-dumps-linux-has-a-wild-new-ui/) Ars Technica

  - [seL4](https://sel4.systems/) is the world's first
    operating-system kernel with an end-to-end proof of implementation
    correctness and security enforcement; it is available as open
    source.
    - 2020-05-25 [The seL4® Microkernel An Introduction](https://sel4.systems/About/seL4-whitepaper.pdf) Gernot Heiser
    - 2020-04-08: [seL4 developers create open source foundation to enable safer, more secure and more reliable computing systems \- CSIRO](https://www.csiro.au/en/News/News-releases/2020/seL4-developers-create-open-source-foundation)
    - [Getting started with seL4, CAmkES, and L4v: Dependencies](https://research.csiro.au/tsblog/getting-started-sel4-camkes-l4v-dependencies/) MAY 19, 2017
    - [seL4 on the Raspberry Pi 3](https://research.csiro.au/tsblog/sel4-raspberry-pi-3/) FEBRUARY 8, 2017
    - Gerwin Klein, June Andronick, Kevin Elphinstone, Toby Murray, Thomas Sewell, Rafal Kolanski and Gernot Heiser  
      [Comprehensive formal verification of an OS microkernel][AEMSKH_14]  
    - Thomas Sewell, Simon Winwood, Peter Gammie, Toby Murray, June Andronick and Gerwin Klein  
      [seL4 enforces integrity](http://ts.data61.csiro.au/projects/seL4/)  
      International Conference on Interactive Theorem Proving, pp. 325-340, Nijmegen, The Netherlands, August, 2011
      > Abstract. We prove the enforcement of two high-level access
      > control properties in the seL4 microkernel: integrity and
      > authority confinement.  Integrity provides an upper bound on
      > write operations. Authority con- finement provides an upper
      > bound on how authority may change. Apart from being a
      > desirable security property in its own right, integrity can be
      > used as a general framing property for the verification of
      > user-level system composition. The proof is machine checked in
      > Isabelle/HOL and the results hold via refinement for the C
      > implementation of the kernel.
  - [Capsicum](https://www.cl.cam.ac.uk/research/security/capsicum/)
    Capsicum is a lightweight OS capability and sandbox framework that
    extends the POSIX API, providing several new OS primitives to
    support object-capability security on UNIX-like operating systems
    - 2019-10 _Capsicum Update 2019_ by Mariusz Zaborski in [FreeBSD Journal: Security](https://www.freebsdfoundation.org/past-issues/security-3/)
    
    - 2017-07-19 [Capsicum Go support](https://lists.cam.ac.uk/pipermail/cl-capsicum-discuss/2017-July/msg00004.html) Ben Laurie
    - [Capsicum for FreeBSD](https://www.cl.cam.ac.uk/research/security/capsicum/freebsd.html)
    - [Capsicum for Linux](https://www.cl.cam.ac.uk/research/security/capsicum/linux.html)
    - Watson,
      R. N. M. [2013 Capsicum year in review](https://www.lightbluetouchpaper.org/2013/12/20/2013-capsicum-year-in-review/). Light
      Blue Touchpaper, 20 December, 2013. Robert Watson reviews
      Capsicum events from 2013: work funded by the FreeBSD Foundation
      and Google on FreeBSD 10.0, Casper in FreeBSD 11, David
      Drysdale's port of Capsicum to Linux at Google, Summer of Code
      students, joint work with the University of Wisconsin on
      Capsicum, and future funded Capsicum work.

[AEMSKH_14]: http://ts.data61.csiro.au/publications/nictaabstracts/Klein_AEMSKH_14.abstract.pml

<a name="cpu"></a>
## CPUs

  - [CHERI](https://www.cl.cam.ac.uk/research/security/ctsrd/) is an open source capability CPU design.
    - 2019-09 [The Arm Morello Board](https://www.cl.cam.ac.uk/research/security/ctsrd/cheri/cheri-morello.html) Arm announced Morello, an experimental CHERI-extended, multicore, superscalar ARMv8-A processor, System-on-Chip (SoC), and prototype board to be available from late 2021. Morello is a part of the UKRI £187M Digital Security by Design Challenge (DSbD) supported by the UK Industrial Strategy Challenge Fund, including a commitment of over £50M commitment by Arm.
    - 2019-09 [An Introduction to CHERI](https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-941.pdf)
      > CHERI (Capability Hardware Enhanced RISC Instructions) extends conventional processor Instruction-Set Architectures (ISAs) with architectural capabilities to enable fine-grained memory protection and highly scalable software compartmentalization. CHERI’s hybrid capability-system approach allows architectural capabilities to be integrated cleanly with contemporary RISC architectures and microarchitectures, as well as with MMU-based C/C++- language software stacks.
      > 
      > CHERI’s capabilities are unforgeable tokens of authority, which can be used to implement both explicit pointers (those declared in the language) and implied pointers (those used by the runtime and generated code) in C and C++. When used for C/C++ memory protection, CHERI directly mitigates a broad range of known vulnerability types and exploit techniques. Support for more scalable software compartmentalization facilitates software mitigation techniques such as sandboxing, which also defend against future (currently unknown) vulnerability classes and exploit techniques.
      > 
      > We have developed, evaluated, and demonstrated this approach through hardware-software prototypes, including multiple CPU prototypes, and a full software stack. This stack includes an adapted version of the Clang/LLVM compiler suite with support for capability-based C/C++, and a full UNIX-style OS (CheriBSD, based on FreeBSD) implementing spatial, referential, and (currently for userspace) non-stack temporal memory safety. Formal modeling and verification allow us to make strong claims about the security properties of CHERI-enabled architectures.
      > 
      > This report is a high-level introduction to CHERI. The report describes our architectural approach, CHERI’s key microarchitectural implications, our approach to formal modeling and proof, the CHERI software model, our software-stack prototypes, further reading, and potential areas of future research.
    - June 2016: _CHERI ISAv5 specification_: improves the maturity of 128-bit capabilities, code efficiency, and description of the protection model.
    - June 2016: _CHERI-JNI: Sinking the Java security model into the C_, explores how CHERI capabilities can be used to support sandboxing with safe and efficient memory sharing between Java Native Interface (JNI) code and the Java Virtual Machine.  ASPLOS 2017
    - May 2016: slides from the first CHERI microkernel workshop, Cambridge, UK in April 2016.

<a name="talk"></a>
## Presentations, Talks, Slides, and Videos

 - 2021-05: [Attested TEEs for Transactional Workloads](https://cfp.padsec.com/padsec-2020/talk/7YRMFG/)  :: Sid Hussmann PADSEC 2021. _We present a generic TEE toolkit applicable for many use-cases in finance, healthcare, and government. Gapfruit TEE embodies a microkernel operating system with capability-based security._ 

  - 2019-02-28: [Delegation: The Missing Piece of Authorization](https://capability.io/blog/2019/02/28/delegation-the-missing-piece-of-authorization) talk by Tristan Slominski at the Austin Node.js meetup

  - 2016-06 [Learn Object Capabilities](https://frontendmasters.com/courses/good-parts-javascript-web/object-capabilities/) by Douglas Crockford, part of [Good Parts of JavaScript and the Web](https://frontendmasters.com/courses/good-parts-javascript-web/). _Using the principle of least authority, Doug explains how the “actor model” can be applied to object oriented programming to create more secure software. He calls this application Object Capabilities._

  - [CloudABI - Pure capability-based security for UNIX](https://www.youtube.com/watch?v=62cYMmSY2Dc)  
    Ed Schouten, 32nd Chaos Communication Congress (32C3), Dec 2015
    
  - [Secure Distributed Programming with Object-capabilities in JavaScript](http://soft.vub.ac.be/events/mobicrant_talks/talk1_ocaps_js.pdf)
    - [Oct 2011 video](https://www.youtube.com/watch?v=w9hHHvhZ_HY) 
  - [Bringing Object-orientation to Security Programming](http://soft.vub.ac.be/events/mobicrant_talks/talk2_OO_security.pdf)
    - [Nov 2011 video](https://www.youtube.com/watch?v=oBqeDYETXME)

  - [Passwords or Webkeys: Which is More Secure?](https://www.youtube.com/watch?v=C7Pt9PGs4C4)  
    video by Marc Stiegler Feb 2012

  - Barth, Adam, Joel Weinberger, and Dawn Song.  
    [Cross-Origin JavaScript Capability Leaks: Detection, Exploitation, and Defense.](https://www.usenix.org/conference/usenixsecurity09/technical-sessions/presentation/cross-origin-javascript-capability-leaks) USENIX
    security symposium. 2009.

  - Sargent, Will
    [Security in Scala: Refined Types and Object Capabilities](https://youtu.be/wfbF5jQiAhQ) Scaladays NYC 2018.

<a name="article"></a>
## Articles

  - 2018-11 [POLA Would Have Prevented the Event-Stream Incident](https://medium.com/agoric/pola-would-have-prevented-the-event-stream-incident-45653ecbda99)  
    Kate Sills, Agoric

  - 2017-06 [Capability-Based Network Communication for Capsicum/CloudABI](ftp://www.si.freebsd.org/www/data//news/status/report-2017-04-2017-06.html#Capability-Based-Network-Communication-for-Capsicum/CloudABI) April–June 2017 FreeBSD status report.
      - [ARPC: GRPC-Like RPC Library That Supports File Descriptor Passing](https://github.com/NuxiNL/arpc)
      - [Flower: A Label-Based Network Backplane](https://github.com/NuxiNL/flower)

  - 2017-05 [What Are Capabilities?](http://habitatchronicles.com/2017/05/what-are-capabilities/)  
    by Chip Morningstar ([Hacker News discussion Jan 7, 2018](https://news.ycombinator.com/item?id=16091975))

  - 2016-08 [Welcoming all Python enthusiasts: CPython 3.6 for CloudABI!](https://nuxi.nl/blog/2016/08/01/cloudabi-python.html)
      August 1, 2016 by Ed Schouten

  - 2015-11 [Objects as Secure Capabilities](http://joeduffyblog.com/2015/11/10/objects-as-secure-capabilities/) Joe Duffy
    - in series: [Blogging about Midori](http://joeduffyblog.com/2015/11/03/blogging-about-midori/)

  - 2009-03 [Not One Click for Security](https://www.hpl.hp.com/techreports/2009/HPL-2009-53.html) Karp, Alan H.; Stiegler, Marc; Close, Tyler, HP Laboratories, HPL-2009-53 _Conventional wisdom holds that security must negatively affect usability. We have developed SCoopFS (Simple Cooperative File Sharing) as a demonstration that need not be so. SCoopFS addresses the problem of sharing files, both with others and with ourselves across machines. Although SCoopFS provides server authentication, client authorization, and end-to-end encryption, the user never sees any of that. The user interface and underlying infrastructure are designed so that normal user acts of designation provide all the information needed to make the desired security decisions. While SCoopFS is a useful tool, it may be more important as a demonstration of the usability that comes from designing the infrastructure and user interaction together._
  
  - 2009-02 [ACLs don't](https://www.hpl.hp.com/techreports/2009/HPL-2009-20.pdf) Tyler Close, HP Laboratories 
_The ACL model is unable to make correct access decisions for interactions involving more than two  principals, since required information is not retained across message sends. Though this deficiency has long been documented in the published literature, it is not widely understood. This logic error in the ACL model is exploited by both the clickjacking and Cross-Site Request Forgery attacks that affect many Web applications_

<a name="lit"></a>
### Peer-reviewed Articles

_See also [Usable Security and Capabilities](https://www.zotero.org/connolly/items/collectionKey/FZ8P5G54/itemKey/2ZPIX23N) bibliography._

  - D. Devriese, Birkedal, and Piessens  
    [Reasoning about Object Capabilities with Logical Relations and Effect Parametricity](https://lirias.kuleuven.be/handle/123456789/529252)  
    1st IEEE European Symposium on Security and Privacy, Congress Center Saar, Saarbrücken, GERMANY, 2016.

  - Gerwin Klein, June Andronick, Kevin Elphinstone, Toby Murray, Thomas Sewell, Rafal Kolanski and Gernot Heiser  
    [Comprehensive formal verification of an OS microkernel][AEMSKH_14]  
    ACM Transactions on Computer Systems, Volume 32, Number 1, pp. 2:1-2:70, February, 2014

  - S. Clebsch and S. Drossopoulou  
    [Fully concurrent garbage collection of actors on many-core machines][237]  
    OOPSLA 2013

  - Mark S. Miller, Tom Van Cutsem, Bill Tulloh  
    [Distributed Electronic Rights in JavaScript][40673]  
    ESOP'13 22nd European Symposium on Programming, Springer (2013)

  - Maffeis, Sergio, John C. Mitchell, and Ankur Taly.
    [Object capabilities and isolation of untrusted web applications.](https://ieeexplore.ieee.org/document/5504710)
    In _2010 IEEE Symposium on Security and Privacy_, pp. 125-140. IEEE, 2010.
    - [slide presentation](https://pdfs.semanticscholar.org/9f52/d7066f3d231ee4e5fba3718871cc2d0cb389.pdf)

  - Barth, Adam, Joel Weinberger, and Dawn Song.  
    [Cross-Origin JavaScript Capability Leaks: Detection, Exploitation, and Defense.](http://webblaze.cs.berkeley.edu/capleaks.html) USENIX
    security symposium. 2009.

  - Close, T.: [Web-key: Mashing with permission](http://waterken.sourceforge.net/web-key/). In: W2SP’08. (2008)

  - Miller MS  
    [Robust composition: towards a unified approach to access control and concurrency control][markm-thesis]  
    Ph.D. Thesis, Johns Hopkins University; 2006.
    > When separately written programs are composed so that they may
    > cooperate, they may instead destructively interfere in
    > unanticipated ways. These hazards limit the scale and
    > functionality of the software systems we can successfully
    > compose. This dissertation presents a framework for enabling
    > those interactions between components needed for the cooperation
    > we intend, while minimizing the hazards of destructive
    > interference.
    >
    > Great progress on the composition problem has been
    > made within the object paradigm, chiefly in the context of
    > sequential, single-machine programming among benign
    > components. We show how to extend this success to support robust
    > composition of concurrent and potentially malicious components
    > distributed over potentially malicious machines. We present E, a
    > distributed, persistent, secure programming language, and
    > CapDesk, a virus-safe desktop built in E, as embodiments of the
    > techniques we explain.

  - Miller, Mark S., E. Dean Tribble, and Jonathan Shapiro. [Concurrency among strangers.](http://www.erights.org/talks/promises/paper/tgc05-submitted.pdf) TGC. Vol. 5. 2005.

  - Mark S. Miller, Chip Morningstar, Bill Frantz  
    [Capability-based Financial Instruments][ode]  
    Proc. Financial Cryptography 2000, Springer-Verlag, Anguila, BWI,
    pp. 349-378.  
    > Every novel cooperative arrangement of mutually suspicious parties
    > interacting electronically — every smart contract — effectively requires a new
    > cryptographic protocol. However, if every new contract requires new
    > cryptographic protocol design, our dreams of cryptographically enabled
    > electronic commerce would be unreachable. Cryptographic protocol design is
    > too hard and expensive, given our unlimited need for new contracts.
    > Just as the digital logic gate abstraction allows digital circuit designers to create large analog circuits without doing analog circuit design, we present
    > cryptographic capabilities as an abstraction allowing a similar economy of
    > engineering effort in creating smart contracts. We explain the E system, which
    > embodies these principles, and show a covered-call-option as a smart contract
    > written in a simple security formalism independent of cryptography, but
    > automatically implemented as a cryptographic protocol coordinating five
    > mutually suspicious parties

[237]: https://github.com/ponylang/ponylang.github.io/blob/master/media/papers/opsla237-clebsch.pdf
[40673]: http://research.google.com/pubs/pub40673.html
[markm-thesis]: http://www.erights.org/talks/thesis/markm-thesis.pdf
[ode]: http://www.erights.org/elib/capability/ode/ode.pdf

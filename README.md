# Awesome Object Capabilities and Capability-based Security

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

Capability-based security enables the concise composition of powerful
patterns of cooperation without vulnerability. [What Are Capabilities?](http://habitatchronicles.com/2017/05/what-are-capabilities/) explains in detail.

 - [Applications and Services](#app-svc)
 - [Libraries and Frameworks](#lib)
 - [Programming Languages](#lang)
 - [Operating Systems](#os)
 - [CPUs](#cpu)
 - [Presentations, Talks, Slides, and Videos](#talk)
 - [Articles](#article)
   - [Peer-reviewed Articles](#lit)

## Applications and Services<a name="app-svc"></a>

  - [Sandstorm](https://sandstorm.io/) is a self-hostable web
    productivity suite and [App Market](https://apps.sandstorm.io/)
    with WordPress, Rocket.Chat, IPython Notebook and many more.
    [Sandstorm's Capability-based Security][scap] protects you and
    your data against application bugs. You can host it yourself, pay
    a few dollars to use Sandstorm Oasis, or deploy it on-premise with
    Sandstorm for Work.
    - [connecting to external HTTP APIs via the Powerbox](https://github.com/sandstorm-io/sandstorm/pull/2870)
      and related powerbox enhancements  
      v0.200 (2017-01-28), v0.203 (2017-03-02)
    - [Sandstorm gets a security review](https://sandstorm.io/news/2017-03-02-security-review)  
      Mar 2017
    - [One click to try an open source web application][1502]  
      By Asheesh Laroia - 06 Feb 2015
    - [Open Source Web Apps Aren't Viable; Let's Fix That][1407]  
      By Kenton Varda - 21 Jul 2014  
  - [Tahoe-LAFS](https://tahoe-lafs.org/) is a highly available
    decentralized cloud storage system. Even if some of the servers
    fail or are taken over by an attacker, the entire file store
    continues to function correctly, preserving your privacy and
    security.
    - 2017-01-18 v1.12.1 released

[scap]: https://sandstorm.io/how-it-works#capabilities
[1407]: https://sandstorm.io/news/2014-07-21-open-source-web-apps-require-federated-hosting
[1502]: https://sandstorm.io/news/2015-02-06-app-demo


## Libraries and Frameworks<a name="lib"></a>

  - JavaScript
    - [Caja](https://developers.google.com/caja/) is a compiler for making
      third-party HTML, CSS and JavaScript safe for embedding.
      Caja safely supports mashups and extends JSON with code.
      - 12 Jan 2017: release v6011 74ba0da
    - [Secure EcmaScript (SES)](https://github.com/google/caja/wiki/SES)
      is a fail-stop subset of ES5. SES should compatibly run all ES5
      code that follows recognized ES5 best practices. The SES
      restrictions support the writing of defensively consistent
      abstractions -- object abstractions that can defend their
      integrity while being exposed to untrusted but confined objects.
      - [Distributed Resilient Secure ECMAScript (Dr. SES)](http://soft.vub.ac.be/~tvcutsem/invokedynamic/drses) ESOP 2013
    - [Capper](https://github.com/marcsAtSkyhunter/Capper) is a web
      application server built on Node.js/Express using
      the [Waterken](http://waterken.sourceforge.net/) webkey protocol
      for object capability security.
      - [fun with Capper and OFX financial transaction fetching](https://groups.google.com/forum/#!topic/captalk/vw1yOecgU10) Jan 2016 to cap-talk

  - rust
    - [Using Capabilities to Design Safer, More Expressive APIs](http://zsck.co/writing/capability-based-apis.html)
      Zack Mullaly Jan 19, 2018

  - C++
      - [Cap’n Proto](https://capnproto.org/) is a high performance
        serialization and RPC protocol with distributed and persistent
        capabilities and promise pipelining. Bindings to python,
        JavaScript (in node.js), Go, Rust, etc. are available
        - [Cap'n Proto 0.5, and how it is central to Sandstorm][1412]  
          By Kenton Varda - 15 Dec 2014

  - Scheme (racket)
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

  - [Network protocols, sans I/O](http://sans-io.readthedocs.io/) supports
    object capability discipline by letting the caller handle network access.

[1412]: https://sandstorm.io/news/2014-12-15-capnproto-0.5


## Programming Languages<a name="lang"></a>

  - [Pony](http://www.ponylang.org/) is an open-source,
    object-oriented, actor-model, capabilities-secure, high
    performance programming language.
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


## Operating Systems<a name="os"></a>

  - [CloudABI](https://nuxi.nl/) is a runtime environment for
    Unix-like systems that introduces dependency injection to full
    Unix applications. Instead of allowing applications to open
    arbitrary files on disk and connect to arbitrary systems on the
    network, you as a user exactly inject those resources that the
    application should access.
    - reference platform: FreeBSD
    - [Capability-Based Network Communication for Capsicum/CloudABI](ftp://www.si.freebsd.org/www/data//news/status/report-2017-04-2017-06.html#Capability-Based-Network-Communication-for-Capsicum/CloudABI) April–June 2017 FreeBSD status report.
      - [ARPC: GRPC-Like RPC Library That Supports File Descriptor Passing](https://github.com/NuxiNL/arpc)
      - [Flower: A Label-Based Network Backplane](https://github.com/NuxiNL/flower)
    - [Kumina sponsoring CloudABI: practical sandboxing for UNIX](https://blog.kumina.nl/2016/10/kumina-sponsoring-cloudabi-practical-sandboxing-for-unix/) October 14th, 2016
    - [Welcoming all Python enthusiasts: CPython 3.6 for CloudABI!](https://nuxi.nl/blog/2016/08/01/cloudabi-python.html)
      August 1, 2016 by Ed Schouten

  - [Capsicum](https://www.cl.cam.ac.uk/research/security/capsicum/)
    Capsicum is a lightweight OS capability and sandbox framework that
    extends the POSIX API, providing several new OS primitives to
    support object-capability security on UNIX-like operating systems
    - [Capsicum Go support](https://lists.cam.ac.uk/pipermail/cl-capsicum-discuss/2017-July/msg00004.html) Ben Laurie 19 Jul 2017
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

  - [genode](https://genode.org/) is a novel OS architecture that is
    able to master the complexity of code and policy -- the most
    fundamental security problem shared by modern general-purpose
    operating systems -- by applying a strict organizational structure
    to all software components including device drivers, system
    services, and applications.
    - [Road Map for 2018](https://genode.org/news/road-map-for-2018) Jan 17, 2018
      > 2018 will be the year of Sculpt.
    - [Genode OS Framework release 17.11][1711] Nov 30, 2017
      > Most of the many improvements of version 17.11 are geared
      > towards the practical use of Genode as day-to-day OS. They
      > include a reworked GUI stack, new user-input features, and the
      > packaging of many components. The new version also revises the
      > boot concept on x86, updates the seL4 kernel, and enhances
      > Genode's user-level networking facilities.

    - [Genode OS Framework release 17.08][1708] Aug 30, 2017  
      > Version 17.08 enables hardware-accelerated graphics on
      > Intel-Gen8 GPUs and expands Genode's seL4-kernel support to
      > the ARM and 64-bit x86 architectures. Further topics are UEFI
      > boot, VFS enhancements such as a new FatFS plugin, and the use
      > of Genode as Xen DomU.

    - [Genode OS Framework release 16.08][1608] Aug 31, 2016

[1608]: https://genode.org/news/genode-os-framework-release-16.08
[1708]: https://genode.org/documentation/release-notes/17.08
[1711]: https://genode.org/news/genode-os-framework-release-17.11

  - [Fuchsia](https://fuchsia.googlesource.com/docs/+/HEAD/getting_started.md) is
    a real-time operating system in development by Google since
    Aug 2016. It's based on a
    microkernel,
    [Magenta](https://fuchsia.googlesource.com/magenta/+/master/README.md),
    with a capability security model.
  
  - [seL4](https://sel4.systems/) is the world's first
    operating-system kernel with an end-to-end proof of implementation
    correctness and security enforcement; it is available as open
    source.
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

  - [cosix](https://github.com/sgielen/cosix) is a capability-based
    operating system that consists of a small kernel that provides
    memory management and inter-process communication, and a userland
    that provides an IP stack and filesystems. The capability
    enforcing mechanism comes from implementing only CloudABI as an
    Application Binary Interface between the userland and the kernel.
    - [2017-06-17: Release of Cosix 1.0](https://github.com/sgielen/cosix/blob/master/RELEASE-1.0.md)

  - [Barrelfish](http://www.barrelfish.org/) is a research operating
    system motivated by two closely related trends in hardware design:
    the rapidly growing number of cores and the increasing diversity
    in computer hardware. Barrelfish uses a single model of
    capabilities to control access to all physical memory, kernel
    objects, communication end-points, and other miscellaneous access
    rights.
    - [release2016-07-20](http://git.barrelfish.org/?p=barrelfish;a=shortlog;h=refs/tags/release2016-07-20)
     
[AEMSKH_14]: http://ts.data61.csiro.au/publications/nictaabstracts/Klein_AEMSKH_14.abstract.pml


## CPUs<a name="cpu"></a>

  - [CHERI](https://www.cl.cam.ac.uk/research/security/ctsrd/) is an open source capability CPU design.

    - June 2016: _CHERI ISAv5 specification_: improves the maturity of 128-bit capabilities, code efficiency, and description of the protection model.
    - June 2016: _CHERI-JNI: Sinking the Java security model into the C_, explores how CHERI capabilities can be used to support sandboxing with safe and efficient memory sharing between Java Native Interface (JNI) code and the Java Virtual Machine.  ASPLOS 2017
    - May 2016: slides from the first CHERI microkernel workshop, Cambridge, UK in April 2016.


## Presentations, Talks, Slides, and Videos<a name="talk"></a>

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


## Articles<a name="article"></a>

  - [What Are Capabilities?](http://habitatchronicles.com/2017/05/what-are-capabilities/)  
    May 7, 2017 by Chip Morningstar ([Hacker News discussion Jan 7, 2018](https://news.ycombinator.com/item?id=16091975))

### Peer-reviewed Articles<a name="lit"></a>

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

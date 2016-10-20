# Awesome Object Capabilities and Capability-based Security

Capability-based security enables the concise composition of powerful
patterns of cooperation without vulnerability.


## Application Hosting

  - [Sandstorm](https://sandstorm.io/) is a self-hostable web
    productivity suite and [App Market](https://apps.sandstorm.io/)
    with WordPress, Rocket.Chat, IPython Notebook and many more.
    [Sandstorm's Capability-based Security][scap] protects you and
    your data against application bugs. You can host it yourself, pay
    a few dollars to use Sandstorm Oasis, or deploy it on-premise with
    Sandstorm for Work.
    - [One click to try an open source web application][1502]  
      By Asheesh Laroia - 06 Feb 2015
    - [Open Source Web Apps Aren't Viable; Let's Fix That][1407]  
      By Kenton Varda - 21 Jul 2014  
      $50K crowdfunding campaign

[scap]: https://sandstorm.io/how-it-works#capabilities
[1407]: https://sandstorm.io/news/2014-07-21-open-source-web-apps-require-federated-hosting
[1502]: https://sandstorm.io/news/2015-02-06-app-demo


## Libraries and Frameworks

  - [Cap’n Proto](https://capnproto.org/) is an open source
    serialization and RPC protocol with distributed and persistent
    capabilities and promise pipelining.
    - [Cap'n Proto 0.5, and how it is central to Sandstorm][1412]  
      By Kenton Varda - 15 Dec 2014

  - [Secure EcmaScript (SES)](https://github.com/google/caja/wiki/SES)
    is a fail-stop subset of ES5. SES should compatibly run all ES5
    code that follows recognized ES5 best practices. The SES
    restrictions support the writing of defensively consistent
    abstractions -- object abstractions that can defend their
    integrity while being exposed to untrusted but confined objects.

  - [Capper](https://github.com/marcsAtSkyhunter/Capper) is web
    application server with built-in object capability security built
    on Node.js/Express

  - [Shill](http://shill-lang.org): Shill is a shell scripting
    language designed to make it easy to follow the Principle of Least
    Privilege. It runs on FreeBSD and is developed in Racket.
    - [Shill: A Secure Shell Scripting Language][shill-osdi]. Scott
      Moore, Christos Dimoulas, Dan King, and Stephen Chong. 11th
      USENIX Symposium on Operating Systems Design and Implementation
      (OSDI), October 2014.

  - [CloudABI](https://nuxi.nl/) is a runtime environment for
    Unix-like systems that introduces dependency injection to full
    Unix applications. Instead of allowing applications to open
    arbitrary files on disk and connect to arbitrary systems on the
    network, you as a user exactly inject those resources that the
    application should access.
    - [Welcoming all Python enthusiasts: CPython 3.6 for CloudABI!](https://nuxi.nl/blog/2016/08/01/cloudabi-python.html)
      August 1, 2016 by Ed Schouten

[1412]: https://sandstorm.io/news/2014-12-15-capnproto-0.5
[shill-osdi]: http://shill.seas.harvard.edu/shill-osdi-2014.pdf

## Operating Systems

  - [Capsicum](https://www.cl.cam.ac.uk/research/security/capsicum/)
    Capsicum is a lightweight OS capability and sandbox framework that
    extends the POSIX API, providing several new OS primitives to
    support object-capability security on UNIX-like operating systems
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
    - [Genode OS Framework release 16.08][1608] Aug 31, 2016  
      > Genode 16.08 makes the entirety of the framework's drivers,
      > protocol stacks, and libraries available on the seL4 kernel,
      > brings VirtualBox 4 to the Muen separation kernel, and hosts
      > VirtualBox 5 on top of the NOVA kernel. Further highlights are
      > virtual networking and TOR, profound Zynq board support, and
      > tools for statistical profiling.

[1608]: https://genode.org/news/genode-os-framework-release-16.08

  - [seL4](https://sel4.systems/) is the world's first
    operating-system kernel with an end-to-end proof of implementation
    correctness and security enforcement; it is available as open
    source.

   - Gerwin Klein, June Andronick, Kevin Elphinstone, Toby Murray, Thomas Sewell, Rafal Kolanski and Gernot Heiser  
     [Comprehensive formal verification of an OS microkernel][AEMSKH_14]  
     ACM Transactions on Computer Systems, Volume 32, Number 1, pp. 2:1-2:70, February, 2014

[AEMSKH_14]: http://ts.data61.csiro.au/publications/nictaabstracts/Klein_AEMSKH_14.abstract.pml


## Programming Languages

  - [Pony](http://www.ponylang.org/) is an open-source,
    object-oriented, actor-model, capabilities-secure, high
    performance programming language.
    - [Fully concurrent garbage collection of actors on many-core machines][237]  
      S. Clebsch and S. Drossopoulou  
      OOPSLA 2013

  - [Monte](http://www.monte-language.org/) is a nascent dynamic
    programming language reminiscent of Python and E. It is based upon
    _The Principle of Least Authority_ (POLA), which governs
    interactions between objects, and a _capability-based object
    model_, which grants certain essential safety guarantees to all
    objects.


## Presentations, Talks, Slides, and Videos

  - [CloudABI - Pure capability-based security for UNIX](https://www.youtube.com/watch?v=62cYMmSY2Dc)  
    Ed Schouten, 32nd Chaos Communication Congress (32C3), Dec 2015
    
    
    
  - [Secure Distributed Programming with Object-capabilities in JavaScript](http://soft.vub.ac.be/events/mobicrant_talks/talk1_ocaps_js.pdf)
    - [Oct 2011 video](https://www.youtube.com/watch?v=w9hHHvhZ_HY) 
  - [Bringing Object-orientation to Security Programming](http://soft.vub.ac.be/events/mobicrant_talks/talk2_OO_security.pdf)
    - [Nov 2011 video](https://www.youtube.com/watch?v=oBqeDYETXME)

  - [Passwords or Webkeys: Which is More Secure?](https://www.youtube.com/watch?v=C7Pt9PGs4C4)  
    video by Marc Stiegler Feb 2012

## Scholarly Articles

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

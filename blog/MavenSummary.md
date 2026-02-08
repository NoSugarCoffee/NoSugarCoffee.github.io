---
slug: Maven Summary
title: Maven Summary
date: 2022-01-01
author: Shixu
author_title: Owner
author_image_url: https://avatars.githubusercontent.com/u/25247325
tags: [maven, java]
---

<head>
  <title>Head Metadata customized title!</title>
  <meta charSet="utf-8" />
  <meta name="mvn" content="summary" />
</head>

## What is Maven
[TL;DR](https://maven.apache.org/guides/getting-started/index.html#What_is_Maven)

## Lifecycles, phases and (plugin) goals

### Concepts
- [A Build Lifecycle is Made Up of Phases](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html#a-build-lifecycle-is-made-up-of-phases). [A Build Phase is Made Up of Plugin Goals](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html#a-build-lifecycle-is-made-up-of-phases). A plugin goal represents a specific task

> Similar to gitlab `pipelines`,`stages` and `jobs`

- Three built-in build lifecycles: [default](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html#default-lifecycle) , clean and site

- When we run a phase – all goals bound to this phase are executed in order. This won't only execute the specified phase but all the preceding phases as well

> E.g. mvn clean install

- A goal can bound to one or more build phases. A build phase can also have zero or more goals bound to it

> [default lifecycle bindings](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html#default-lifecycle-bindings-packaging-ejb-ejb3-jar-par-rar-war)

- A goal not bound to any build phase could be executed outside of the build lifecycle by direct invocation

> E.g. mvn dependency:tree

### Look up phases and goals

Use [`mvn fr.jcgay.maven.plugins:buildplan-maven-plugin:list`](https://stackoverflow.com/questions/1709625/maven-command-to-list-lifecycle-phases-along-with-bound-goals) to list phases and goals in default lifecycle

## Direct/Transitive dependency
> A -> B -> C , B, C is A's dependency, B is A's direct dependency, C is A's transitive dependency

## Dependency conflict

The different versions of same dependency are all needed by others

### Dependency mediation

- Nearest definition

> A -> B -> C -> D 2.0 and A -> E -> D 1.0  result will be D 1.0

- First declaration

```
// A.xml
<dependecy>B</dependency>
<dependecy>C</dependency>
```
> A -> B -> D 2.0 and A -> C -> D 1.0  result will be D 2.0


### Solution

- According dependency mediation if have compatible versions
- Use [shade plugin](https://maven.apache.org/plugins/maven-shade-plugin/) if have not uncompatible versions

## Best practice

- Although transitive dependencies can implicitly include desired dependencies, it is a good practice to explicitly specify the dependencies your source code uses directly. This best practice proves its value especially when the dependencies of your project change their dependencies

- Use a dependencyManagement section in a parent pom.xml to avoid duplicating dependency information in child projects

- The phases named with hyphenated-words (pre-*, post-*, or process-*) are not usually directly called from the command line. These phases sequence the build, producing intermediate results that are not useful outside the build. In the case of invoking integration-test, the environment may be left in a hanging state

## Commonly used

### Commands

- Help making best practice more achievable: `mvn dependency:analyze`

- Run ut singly: `mvn -DfailIfNoTests=false -pl product.profile-service -Dtest=CheckSetHotelValidatorTest -am test`

- Download artifact: `mvn dependency:get -DremoteRepositories=http://repo1.maven.org/maven2/ -DgroupId=com.google.code.gson -DartifactId=gson -Dversion=2.8.8`

## Refs

- https://maven.apache.org/
- https://www.baeldung.com/maven-goals-phases
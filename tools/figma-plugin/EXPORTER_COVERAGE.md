# Figma Exporter Coverage Matrix

This tracks current Figma exporter coverage against Peblor contract section and element types.

Legend:

- `supported`: explicit converter route exists
- `partial`: heuristic or constrained support
- `missing`: no direct converter route today

## Sections

| Section type      | Status                 | Evidence                                                          |
| ----------------- | ---------------------- | ----------------------------------------------------------------- |
| `contentBlock`    | supported              | `src/converters/node-to-section.ts`                               |
| `sectionColumn`   | supported              | `src/converters/section-column-convert.ts`                        |
| `revealSection`   | supported              | `src/converters/section-reveal.ts`                                |
| `scrollContainer` | supported              | `src/converters/section-scroll-divider-form.ts`                   |
| `divider`         | supported              | `src/converters/section-scroll-divider-form.ts`                   |
| `formBlock`       | supported              | `src/converters/section-scroll-divider-form.ts`                   |
| `sectionTrigger`  | supported (annotation) | `src/converters/node-to-section.ts` (`[pb: type=sectionTrigger]`) |

## Elements

| Element type                | Status                 | Evidence                                                                    |
| --------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `elementHeading`            | supported              | `src/converters/text.ts`                                                    |
| `elementBody`               | supported              | `src/converters/text.ts`                                                    |
| `elementLink`               | supported              | `src/converters/text.ts`                                                    |
| `elementImage`              | supported              | `src/converters/image.ts`                                                   |
| `elementVideo`              | supported              | `src/converters/video-convert.ts`                                           |
| `elementSVG`                | supported              | `src/converters/vector.ts`                                                  |
| `elementRichText`           | partial                | mixed-style text path in `src/converters/node-element-group.ts`             |
| `elementButton`             | supported              | `src/converters/button.ts`                                                  |
| `elementInput`              | partial                | heuristic conversion in `src/converters/element-input-convert.ts`           |
| `elementSpacer`             | supported              | `src/converters/node-to-element.ts`                                         |
| `elementGroup`              | supported              | `src/converters/node-to-element.ts`                                         |
| `elementScrollProgressBar`  | partial                | instance mapping in `src/converters/node-instance-convert.ts`               |
| `elementRive`               | partial                | instance mapping in `src/converters/node-instance-convert.ts`               |
| `elementVector`             | missing                | no dedicated `type: elementVector` emitter                                  |
| `elementRange`              | supported (annotation) | `src/converters/node-to-element.ts` (`[pb: type=range, min=..., max=...]`)  |
| `elementVideoTime`          | missing                | no route                                                                    |
| `elementVideoQualitySelect` | missing                | no route                                                                    |
| `elementDivider`            | missing                | no element-level divider route                                              |
| `elementModel3D`            | missing                | no route                                                                    |
| `elementInfiniteScroll`     | missing                | no route                                                                    |
| `elementFormField`          | supported (annotation) | `src/converters/node-to-element.ts` (`[pb: type=formfield, fieldType=...]`) |
| `elementAudio`              | supported (annotation) | `src/converters/node-to-element.ts` (`[pb: type=audio, src=...]`)           |
| `elementCounter`            | supported (annotation) | `src/converters/node-to-element.ts` (`[pb: type=counter, target=...]`)      |
| `elementMarquee`            | supported (annotation) | `src/converters/node-to-element.ts` (`[pb: type=marquee, text=...]`)        |
| `elementImageCompare`       | missing                | no route                                                                    |
| `elementTabs`               | supported (annotation) | `src/converters/node-to-element.ts` (`[pb: type=tabs, tabs=...]`)           |
| `elementTooltip`            | supported (annotation) | `src/converters/node-to-element.ts` (`[pb: type=tooltip, content=...]`)     |
| `elementLottie`             | supported (annotation) | `src/converters/node-to-element.ts` (`[pb: type=lottie, src=...]`)          |
| `elementDrag`               | supported (annotation) | `src/converters/node-to-element.ts` (`[pb: type=drag, axis=...]`)           |

## Next implementation priority

1. `elementModel3D`
2. `elementInfiniteScroll`
3. `elementImageCompare`
4. `elementVideoTime`
5. `elementVideoQualitySelect`

These are high-impact interactive types that currently require manual post-export editing.

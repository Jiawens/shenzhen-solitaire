#!/bin/bash

SCRIPT_DIR=$(cd $(dirname ${BASH_SOURCE[0]}); pwd)

mkdir $SCRIPT_DIR/small_icons
mkdir $SCRIPT_DIR/large_icons

echo "Extracting from $1..."

root_colors="green red white"
root_states="active down up"
for color in $root_colors 
do
    for state in $root_states 
    do
        cp "$1"/textures/solitaire/button_${color}_${state}.png $SCRIPT_DIR/
    done
done

root="card_back card_front card_shadow card_texture table_large win_count"
for file in ${root[@]}
do
    cp "$1"/textures/solitaire/${file}.png $SCRIPT_DIR/
done

small_icons="bamboo characters coins dragon_green dragon_red dragon_white flower"
for file in $small_icons
do
    cp "$1"/textures/solitaire/small_icons/${file}.png $SCRIPT_DIR/small_icons/
done

large_icons_colors="bamboo char coins"
for color in $large_icons_colors
do
    for i in {1..9}
    do
        cp "$1"/textures/solitaire/large_icons/${color}_${i}.png $SCRIPT_DIR/large_icons/
    done
 done

large_icons="dragon_green dragon_red dragon_white flower"
for file in $large_icons
do
    cp "$1"/textures/solitaire/large_icons/${file}.png $SCRIPT_DIR/large_icons/
done

cp "$1"/music/Solitaire.ogg $SCRIPT_DIR/

echo "Done."
import json
import re

import pandas as pd
import requests

# pat: re.Pattern = re.compile(r"\{\{List of champions row\|(\w+)\}\}")


# with open(
#     "/home/madssb/champion_spin/text_to_parse.txt", mode="r", encoding="utf-8"
# ) as infile:
#     contents = infile.read()


# # print(contents)
# # exit(1)


# champions = pat.findall(contents)


# with open("/home/madssb/champion_spin/champions.json", "w", encoding="utf-8") as f:
#     json.dump(champions, f, ensure_ascii=False, indent=2)

with open("/home/madssb/champion_spin/champions.json", "r", encoding="utf-8") as f:
    champions = json.load(f)


def champ_img_url(champion: str) -> str:
    return f"https://wiki.leagueoflegends.com/en-us/images/thumb/{champion}_OriginalSquare.png/46px-{champion}_OriginalSquare.png"


champion_img_urls_dict = {}

for champion in champions:
    champion_img_url = champ_img_url(champion)
    champion_img_urls_dict.update({champion: champion_img_url})


with open("/home/madssb/champion_spin/champion_imgs.json", "w", encoding="utf-8") as f:
    json.dump(champion_img_urls_dict, f, ensure_ascii=False, indent=2)

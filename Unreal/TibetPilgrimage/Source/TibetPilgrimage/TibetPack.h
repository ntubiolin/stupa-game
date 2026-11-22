#pragma once

#include "CoreMinimal.h"

enum class ETibetItem : uint8 { Amrita, Vajra, Bell, Robe, Map, Thangka, Count };

struct FTibetItemInfo
{
    const TCHAR* NameEn;
    const TCHAR* NameZh;
    const TCHAR* EffectEn;
    const TCHAR* EffectZh;
    const TCHAR* SourceEn;
    const TCHAR* SourceZh;
};

const FTibetItemInfo& TibetItemInfo(ETibetItem Item);

#pragma once

#include "CoreMinimal.h"

struct FTojiProgress
{
    bool bEnglish = true;
    int32 Completed = 0;
    FString WebBackup;
};

enum class ETojiImportResult
{
    Success,
    Invalid,
    StorageError
};

namespace TojiSave
{
    inline constexpr int32 QinglongSteps = 3;
    inline constexpr int32 ChapterSteps = 6;
    extern const TCHAR* const OrderedSteps[QinglongSteps + ChapterSteps];

    FString Directory();
    bool ParseWeb(const FString& Json, FTojiProgress& Result);
    bool Load(FTojiProgress& Result);
    bool Write(const FTojiProgress& Progress);
    ETojiImportResult Import(const FString& FilePath, FTojiProgress& Result);
}
